/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import { stableStringify } from '@kbn/std';
import { createPromiseFromStreams, createMapStream, createConcatStream } from '@kbn/utils';

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportByObjectOptions,
} from '@kbn/core-saved-objects-server';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsExportError } from '@kbn/core-saved-objects-import-export-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
import { badResponseSchema } from './shared_schemas';
import { validateTypes, validateObjects, catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
}

type EitherExportOptions = SavedObjectsExportByTypeOptions | SavedObjectsExportByObjectOptions;

interface ExportRawOptions {
  type?: string | string[];
  hasReference?: { id: string; type: string } | Array<{ id: string; type: string }>;
  objects?: Array<{ id: string; type: string }>;
  search?: string;
  includeReferencesDeep: boolean;
  excludeExportDetails: boolean;
}

interface ExportOptions {
  types?: string[];
  hasReference?: Array<{ id: string; type: string }>;
  objects?: Array<{ id: string; type: string }>;
  search?: string;
  includeReferencesDeep: boolean;
  excludeExportDetails: boolean;
}

const cleanOptions = ({
  type,
  objects,
  search,
  hasReference,
  excludeExportDetails,
  includeReferencesDeep,
}: ExportRawOptions): ExportOptions => {
  return {
    types: typeof type === 'string' ? [type] : type,
    search,
    objects,
    hasReference: hasReference && !Array.isArray(hasReference) ? [hasReference] : hasReference,
    excludeExportDetails,
    includeReferencesDeep,
  };
};

const isExportByTypeOptions = (
  options: EitherExportOptions
): options is SavedObjectsExportByTypeOptions => {
  return Boolean((options as SavedObjectsExportByTypeOptions).types);
};

const validateOptions = (
  {
    types,
    objects,
    excludeExportDetails,
    hasReference,
    includeReferencesDeep,
    search,
  }: ExportOptions,
  {
    exportSizeLimit,
    supportedTypes,
    request,
  }: { exportSizeLimit: number; supportedTypes: string[]; request: KibanaRequest }
): EitherExportOptions => {
  const hasTypes = (types?.length ?? 0) > 0;
  const hasObjects = (objects?.length ?? 0) > 0;
  if (!hasTypes && !hasObjects) {
    throw new Error('Either `type` or `objects` are required.');
  }
  if (hasTypes && hasObjects) {
    throw new Error(`Can't specify both "types" and "objects" properties when exporting`);
  }
  if (hasObjects) {
    if (objects!.length > exportSizeLimit) {
      throw new Error(`Can't export more than ${exportSizeLimit} objects`);
    }
    if (typeof search === 'string') {
      throw new Error(`Can't specify both "search" and "objects" properties when exporting`);
    }
    if (hasReference && hasReference.length) {
      throw new Error(`Can't specify both "references" and "objects" properties when exporting`);
    }
    const validationError = validateObjects(objects!, supportedTypes);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      objects: objects!,
      excludeExportDetails,
      includeReferencesDeep,
      request,
    };
  } else {
    const validationError = validateTypes(types!, supportedTypes);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      types: types!,
      hasReference,
      search,
      excludeExportDetails,
      includeReferencesDeep,
      request,
    };
  }
};

export const registerExportRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData }: RouteDependencies
) => {
  const { maxImportExportSize } = config;

  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });

  router.post(
    {
      path: '/_export',
      options: {
        summary: `Export saved objects`,
        tags: ['oas-tag:saved objects'],
        access: 'public',
        description: `Retrieve sets of saved objects that you want to import into Kibana. You must include \`type\` or \`objects\` in the request body. The output of exporting saved objects must be treated as opaque. Tampering with exported data risks introducing unspecified errors and data loss.

Exported saved objects are not backwards compatible and cannot be imported into an older version of Kibana.

NOTE: The exported saved objects include \`coreMigrationVersion\` and \`typeMigrationVersion\` metadata. If you store exported saved objects outside of Kibana (for example in NDJSON files) or generate them yourself, you must preserve or include these fields to retain forward compatibility across Kibana versions.

NOTE: The \`savedObjects.maxImportExportSize\` configuration setting limits the number of saved objects which may be exported.`,
        oasOperationObject: () => path.resolve(__dirname, './export.examples.yaml'),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        request: {
          body: schema.object({
            hasReference: schema.maybe(
              schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
            ),
            type: schema.maybe(
              schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
                meta: {
                  description:
                    'The saved object types to include in the export. Use `*` to export all the types. Valid options depend on enabled plugins, but may include `visualization`, `dashboard`, `search`, `index-pattern`, `tag`, `config`, `config-global`, `lens`, `map`, `event-annotation-group`, `query`, `url`, `action`, `alert`, `alerting_rule_template`, `apm-indices`, `cases-user-actions`, `cases`, `cases-comments`, `infrastructure-monitoring-log-view`, `ml-trained-model`, `osquery-saved-query`, `osquery-pack`, `osquery-pack-asset`.',
                },
              })
            ),
            objects: schema.maybe(
              schema.arrayOf(
                schema.object({
                  type: schema.string(),
                  id: schema.string(),
                }),
                {
                  maxSize: maxImportExportSize,
                  meta: {
                    description:
                      'A list of objects to export. NOTE: this optional parameter cannot be combined with the `types` option',
                  },
                }
              )
            ),
            search: schema.maybe(
              schema.string({
                meta: {
                  description:
                    'Search for documents to export using the Elasticsearch Simple Query String syntax.',
                },
              })
            ),
            includeReferencesDeep: schema.boolean({
              defaultValue: false,
              meta: {
                description: 'Includes all of the referenced objects in the exported objects.',
              },
            }),
            excludeExportDetails: schema.boolean({
              defaultValue: false,
              meta: { description: 'Do not add export details entry at the end of the stream.' },
            }),
          }),
        },
        response: {
          200: {
            bodyContentType: 'application/x-ndjson',
            description: 'Indicates a successfull call.',
            body: okResponseSchema,
          },
          400: badResponseSchema(),
        },
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      const cleaned = cleanOptions(request.body);
      const { typeRegistry, getExporter, getClient } = (await context.core).savedObjects;
      const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((t) => t.name);

      let options: EitherExportOptions;
      try {
        options = validateOptions(cleaned, {
          request,
          exportSizeLimit: maxImportExportSize,
          supportedTypes,
        });
      } catch (e) {
        return response.badRequest({
          body: e,
        });
      }

      const includedHiddenTypes = supportedTypes.filter((supportedType) =>
        typeRegistry.isHidden(supportedType)
      );

      const client = getClient({ includedHiddenTypes });
      const exporter = getExporter(client);

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient
        .incrementSavedObjectsExport({
          request,
          types: cleaned.types ?? [],
          supportedTypes,
        })
        .catch(() => {});

      try {
        const exportStream = isExportByTypeOptions(options)
          ? await exporter.exportByTypes(options)
          : await exporter.exportByObjects(options);

        const docsToExport: string[] = await createPromiseFromStreams([
          exportStream,
          createMapStream((obj: unknown) => {
            return stableStringify(obj);
          }),
          createConcatStream([]),
        ]);

        return response.ok({
          body: docsToExport.join('\n'),
          headers: {
            'Content-Disposition': `attachment; filename="export.ndjson"`,
            'Content-Type': 'application/ndjson',
          },
        });
      } catch (e) {
        if (e instanceof SavedObjectsExportError) {
          return response.badRequest({
            body: {
              message: e.message,
              attributes: e.attributes,
            },
          });
        }
        throw e;
      }
    })
  );
};

const okResponseSchema = () => schema.object({}, { unknowns: 'allow' });
