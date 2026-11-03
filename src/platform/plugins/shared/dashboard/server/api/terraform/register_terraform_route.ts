/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import type {
  DashboardConverter,
  JsonObject,
  JsonValue,
  Reference,
  ReferencedObject,
} from '@kbn/as-code-dashboard-terraform';
import type { TagAttributes } from '@kbn/saved-objects-tagging-oss-plugin/common';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { MAX_TITLE_LENGTH } from '@kbn/as-code-shared-schemas';
import { logRequest } from '@kbn/as-code-utils';
import {
  DASHBOARD_INTERNAL_API_PATH,
  DASHBOARD_TERRAFORM_EXPORT_FLAG,
} from '../../../common/constants';
import type { DashboardTerraformResponseBody, LiteralDataView, LiteralTag } from './types';

// Loaded on first use, not at startup; only a successful load is kept, so a failed one is retried.
let converter: Promise<DashboardConverter> | undefined;
const getConverter = (): Promise<DashboardConverter> => {
  converter ??= import('@kbn/as-code-dashboard-terraform')
    .then(async ({ createDashboardConverter, loadDashboardOas }) =>
      createDashboardConverter(await loadDashboardOas())
    )
    .catch((error) => {
      converter = undefined;
      throw error;
    });
  return converter;
};

/** The largest request body the route accepts, with headroom for the defaults sanitizing adds. */
export const MAX_TERRAFORM_REQUEST_BYTES = 2 * 1024 * 1024;

// Panel types point at the mapping that failed without logging the dashboard's own text.
const panelTypes = (list: JsonValue | undefined): string[] =>
  Array.isArray(list)
    ? list.flatMap((panel) => {
        if (!panel || typeof panel !== 'object' || Array.isArray(panel)) return ['?'];
        if (typeof panel.type === 'string') return [panel.type];
        return Array.isArray(panel.panels) ? ['section', ...panelTypes(panel.panels)] : ['?'];
      })
    : [];

const describeDashboard = ({ panels, pinned_panels: pinnedPanels }: JsonObject): string =>
  `panels [${panelTypes(panels).join(', ')}], pinned panels [${panelTypes(pinnedPanels).join(
    ', '
  )}]`;

interface ReadTags {
  /** The tags a resource is written for. */
  tags: ReferencedObject[];
  /** The tags that stay literal IDs in the dashboard. */
  literalTags: LiteralTag[];
}

// Reads with the user's client (`read` on `tag`, as the get-tag route needs); unreadable, missing and Kibana-managed
// tags stay literal IDs, and so do tags also used where no reference reaches.
const readTags = async (
  client: SavedObjectsClientContract,
  ids: string[],
  unlinkableIds: ReadonlySet<string>,
  resourceType: string
): Promise<ReadTags> => {
  if (!ids.length) return { tags: [], literalTags: [] };
  const unreadable = (id: string): LiteralTag => ({ id, reason: 'unreadable' });
  try {
    const { saved_objects: savedObjects } = await client.bulkGet<TagAttributes>(
      ids.map((id) => ({ type: 'tag', id }))
    );
    const result: ReadTags = { tags: [], literalTags: [] };
    for (const tag of savedObjects) {
      if (isSavedObjectErrorResult(tag)) {
        result.literalTags.push(unreadable(tag.id));
        continue;
      }
      const {
        id,
        managed,
        attributes: { name, color, description },
      } = tag;
      if (managed) {
        result.literalTags.push({ id, reason: 'managed', name });
        continue;
      }
      if (unlinkableIds.has(id)) {
        result.literalTags.push({ id, reason: 'unlinkable', name });
        continue;
      }
      result.tags.push({ resourceType, id, name, attributes: { name, color, description } });
    }
    return result;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isForbiddenError(e)) {
      return { tags: [], literalTags: ids.map(unreadable) };
    }
    throw e;
  }
};

interface ReadDataViews {
  /** The data views a resource is written for. */
  dataViews: ReferencedObject[];
  /** The data views that stay literal IDs in the dashboard. */
  literalDataViews: LiteralDataView[];
}

// Reads with the user's client, in the dashboard's space. An ID that is not a saved data view there (missing or ad
// hoc) or that the user cannot read stays literal, and so does one also used where no reference reaches.
const readDataViews = async (
  client: SavedObjectsClientContract,
  ids: string[],
  unlinkableIds: ReadonlySet<string>,
  resourceType: string,
  toBody: (dataView: DataViewAttributes) => JsonObject
): Promise<ReadDataViews> => {
  if (!ids.length) return { dataViews: [], literalDataViews: [] };
  try {
    const { saved_objects: savedObjects } = await client.bulkGet<DataViewAttributes>(
      ids.map((id) => ({ type: DATA_VIEW_SAVED_OBJECT_TYPE, id }))
    );
    const result: ReadDataViews = { dataViews: [], literalDataViews: [] };
    for (const dataView of savedObjects) {
      if (isSavedObjectErrorResult(dataView)) {
        const reason = dataView.error.statusCode === 404 ? 'not_found' : 'unreadable';
        result.literalDataViews.push({ id: dataView.id, reason });
        continue;
      }
      const { id, attributes } = dataView;
      const name = attributes.name || attributes.title;
      if (unlinkableIds.has(id)) {
        result.literalDataViews.push({ id, reason: 'unlinkable', name });
        continue;
      }
      result.dataViews.push({ resourceType, id, name, attributes: toBody(attributes) });
    }
    return result;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isForbiddenError(e)) {
      return {
        dataViews: [],
        literalDataViews: ids.map((id) => ({ id, reason: 'unreadable' })),
      };
    }
    throw e;
  }
};

const idsOf = (references: readonly Reference[], resourceType: string): string[] => [
  ...new Set(references.filter((r) => r.resourceType === resourceType).map(({ id }) => id)),
];

/** Registers the internal, flag-gated route behind Export → Terraform. */
export function registerTerraformRoute(
  router: VersionedRouter<RequestHandlerContext>,
  logger: Logger
) {
  router
    .post({
      path: `${DASHBOARD_INTERNAL_API_PATH}/_terraform`,
      summary: 'Convert a dashboard to Terraform',
      security: { authz: AuthzDisabled.delegateToSOClient },
      access: 'internal',
      options: { body: { maxBytes: MAX_TERRAFORM_REQUEST_BYTES } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              dashboard: schema.object(
                // The title names the Terraform resource.
                { title: schema.maybe(schema.string({ maxLength: MAX_TITLE_LENGTH })) },
                { unknowns: 'allow' }
              ),
            }),
          },
        },
      },
      async (ctx, req, res) => {
        const { featureFlags, savedObjects } = await ctx.core;
        if (!(await featureFlags.getBooleanValue(DASHBOARD_TERRAFORM_EXPORT_FLAG, false))) {
          return res.notFound();
        }
        const {
          DashboardConversionError,
          DASHBOARD_RESOURCE_TYPE,
          DATA_VIEW_RESOURCE_TYPE,
          TAG_RESOURCE,
          TERRAFORM_PROVIDER,
          linkReferences,
          toDataViewResourceBody,
          toResourceName,
        } = await import('@kbn/as-code-dashboard-terraform');
        const dashboard = req.body.dashboard as JsonObject;
        try {
          const convert = await getConverter();
          const conversion = convert(dashboard);
          const { droppedFields, skippedPanels, partialPanels, jsonPanels, references } =
            conversion;
          const unlinkableIds = new Set(conversion.unlinkableIds);
          const [{ tags, literalTags }, { dataViews, literalDataViews }] = await Promise.all([
            readTags(
              savedObjects.client,
              idsOf(references, TAG_RESOURCE.type),
              unlinkableIds,
              TAG_RESOURCE.type
            ),
            readDataViews(
              savedObjects.client,
              idsOf(references, DATA_VIEW_RESOURCE_TYPE),
              unlinkableIds,
              DATA_VIEW_RESOURCE_TYPE,
              toDataViewResourceBody
            ),
          ]);
          const { body, resources } = linkReferences(conversion, [...tags, ...dataViews]);
          const { body: adoptBody } = linkReferences(conversion, tags);
          const responseBody: DashboardTerraformResponseBody = {
            resource_type: DASHBOARD_RESOURCE_TYPE,
            resource_name: toResourceName(req.body.dashboard.title ?? '', 'dashboard'),
            body,
            adopt_body: adoptBody,
            resources,
            tag_resource: {
              type: TAG_RESOURCE.type,
              min_kibana_version: TAG_RESOURCE.minKibanaVersion,
            },
            literal_tags: literalTags,
            data_view_resource: { type: DATA_VIEW_RESOURCE_TYPE },
            literal_data_views: literalDataViews,
            dropped_fields: droppedFields,
            skipped_panels: skippedPanels,
            partial_panels: partialPanels.map(({ droppedFields: dropped, ...panel }) => ({
              ...panel,
              dropped_fields: dropped,
            })),
            json_panels: jsonPanels,
            provider: { ...TERRAFORM_PROVIDER },
          };
          return res.ok({ body: responseBody });
        } catch (e) {
          if (e instanceof DashboardConversionError) {
            return res.badRequest({ body: { message: e.message } });
          }
          logRequest(
            logger,
            req,
            'error',
            `Terraform conversion failed for a dashboard with ${describeDashboard(dashboard)}: ${
              e.stack ?? e.message
            }`
          );
          throw e;
        }
      }
    );
}
