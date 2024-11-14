/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandler, RouteAuthz, StartServicesAccessor } from '@kbn/core/server';
import { VersionedRouteValidation } from '@kbn/core-http-server';
import { INITIAL_REST_VERSION_INTERNAL as version } from '../../constants';
import { IndexPatternsFetcher } from '../../fetcher';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import type { FieldDescriptorRestResponse } from '../route_types';
import { FIELDS_FOR_WILDCARD_PATH as path } from '../../../common/constants';

/**
 * Accepts one of the following:
 * 1. An array of field names
 * 2. A JSON-stringified array of field names
 * 3. A single field name (not comma-separated)
 * @returns an array of field names
 * @param fields
 */
export const parseFields = (fields: string | string[], fldName: string): string[] => {
  if (Array.isArray(fields)) return fields;
  try {
    return JSON.parse(fields);
  } catch (e) {
    if (!fields.includes(',')) return [fields];
    throw new Error(
      `${fldName} should be an array of strings, a JSON-stringified array of strings, or a single string`
    );
  }
};

const access = 'internal';

export type IBody = { index_filter?: estypes.QueryDslQueryContainer } | undefined;
export interface IQuery {
  pattern: string;
  meta_fields: string | string[];
  type?: string;
  rollup_index?: string;
  allow_no_index?: boolean;
  include_unmapped?: boolean;
  fields?: string | string[];
  allow_hidden?: boolean;
  field_types?: string | string[];
  include_empty_fields?: boolean;
}

export const querySchema = schema.object({
  pattern: schema.string(),
  meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
    defaultValue: [],
  }),
  type: schema.maybe(schema.string()),
  rollup_index: schema.maybe(schema.string()),
  allow_no_index: schema.maybe(schema.boolean()),
  include_unmapped: schema.maybe(schema.boolean()),
  fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  allow_hidden: schema.maybe(schema.boolean()),
  field_types: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
      defaultValue: [],
    })
  ),
  include_empty_fields: schema.maybe(schema.boolean()),
});

const fieldSubTypeSchema = schema.object({
  multi: schema.maybe(schema.object({ parent: schema.string() })),
  nested: schema.maybe(schema.object({ path: schema.string() })),
});

const FieldDescriptorSchema = schema.object({
  aggregatable: schema.boolean(),
  name: schema.string(),
  readFromDocValues: schema.boolean(),
  searchable: schema.boolean(),
  type: schema.string(),
  esTypes: schema.maybe(schema.arrayOf(schema.string())),
  subType: fieldSubTypeSchema,
  metadata_field: schema.maybe(schema.boolean()),
  fixedInterval: schema.maybe(schema.arrayOf(schema.string())),
  timeZone: schema.maybe(schema.arrayOf(schema.string())),
  timeSeriesMetric: schema.maybe(
    schema.oneOf([
      schema.literal('histogram'),
      schema.literal('summary'),
      schema.literal('counter'),
      schema.literal('gauge'),
      schema.literal('position'),
    ])
  ),
  timeSeriesDimension: schema.maybe(schema.boolean()),
  conflictDescriptions: schema.maybe(
    schema.recordOf(schema.string(), schema.arrayOf(schema.string()))
  ),
  defaultFormatter: schema.maybe(schema.string()),
});

export const validate: VersionedRouteValidation<any, any, any> = {
  request: {
    query: querySchema,
    // not available to get request
    body: schema.maybe(schema.object({ index_filter: schema.any() })),
  },
  response: {
    200: {
      body: () =>
        schema.object({
          fields: schema.arrayOf(FieldDescriptorSchema),
          indices: schema.arrayOf(schema.string()),
        }),
    },
  },
};

const handler: (isRollupsEnabled: () => boolean) => RequestHandler<{}, IQuery, IBody> =
  (isRollupsEnabled) => async (context, request, response) => {
    const core = await context.core;
    const { asCurrentUser } = core.elasticsearch.client;
    const uiSettings = core.uiSettings.client;
    const indexPatterns = new IndexPatternsFetcher(asCurrentUser, {
      uiSettingsClient: uiSettings,
      rollupsEnabled: isRollupsEnabled(),
    });

    const {
      pattern,
      meta_fields: metaFields,
      type,
      rollup_index: rollupIndex,
      allow_no_index: allowNoIndex,
      include_unmapped: includeUnmapped,
      allow_hidden: allowHidden,
      field_types: fieldTypes,
      include_empty_fields: includeEmptyFields,
    } = request.query;

    // not available to get request
    const indexFilter = request.body?.index_filter;

    let parsedFields: string[] = [];
    let parsedMetaFields: string[] = [];
    let parsedFieldTypes: string[] = [];
    try {
      parsedMetaFields = parseFields(metaFields, 'meta_fields');
      parsedFields = parseFields(request.query.fields ?? [], 'fields');
      parsedFieldTypes = parseFields(fieldTypes || [], 'field_types');
    } catch (error) {
      return response.badRequest({ body: error.message });
    }

    try {
      const { fields, indices } = await indexPatterns.getFieldsForWildcard({
        pattern,
        metaFields: parsedMetaFields,
        type,
        rollupIndex,
        fieldCapsOptions: {
          allow_no_indices: allowNoIndex || false,
          includeUnmapped,
        },
        fieldTypes: parsedFieldTypes,
        indexFilter,
        allowHidden,
        includeEmptyFields,
        ...(parsedFields.length > 0 ? { fields: parsedFields } : {}),
      });

      const body: { fields: FieldDescriptorRestResponse[]; indices: string[] } = {
        fields,
        indices,
      };

      return response.ok({
        body,
        headers: {
          'content-type': 'application/json',
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        !!error?.isBoom &&
        !!error?.output?.payload &&
        typeof error?.output?.payload === 'object'
      ) {
        const payload = error?.output?.payload;
        return response.notFound({
          body: {
            message: payload.message,
            attributes: payload,
          },
        });
      } else {
        return response.notFound();
      }
    }
  };

export const registerFieldForWildcard = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  isRollupsEnabled: () => boolean
) => {
  const configuredHandler = handler(isRollupsEnabled);
  const authz: RouteAuthz = { enabled: false, reason: 'Authorization provided by Elasticsearch' };

  // handler
  router.versioned.put({ path, access }).addVersion(
    {
      version,
      security: { authz },
      validate,
    },
    configuredHandler
  );
  router.versioned.post({ path, access }).addVersion(
    {
      version,
      security: { authz },
      validate,
    },
    configuredHandler
  );
  router.versioned.get({ path, access }).addVersion(
    {
      version,
      security: { authz },
      validate: { request: { query: querySchema }, response: validate.response },
    },
    configuredHandler
  );
};
