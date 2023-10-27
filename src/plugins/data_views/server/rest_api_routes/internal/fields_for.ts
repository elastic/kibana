/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { IRouter, RequestHandler, StartServicesAccessor } from '@kbn/core/server';
import { FullValidationConfig } from '@kbn/core-http-server';
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
export const parseFields = (fields: string | string[]): string[] => {
  if (Array.isArray(fields)) return fields;
  try {
    return JSON.parse(fields);
  } catch (e) {
    if (!fields.includes(',')) return [fields];
    throw new Error(
      'metaFields should be an array of field names, a JSON-stringified array of field names, or a single field name'
    );
  }
};

const access = 'internal';

type IBody = { index_filter?: estypes.QueryDslQueryContainer } | undefined;
interface IQuery {
  pattern: string;
  meta_fields: string | string[];
  type?: string;
  rollup_index?: string;
  allow_no_index?: boolean;
  include_unmapped?: boolean;
  fields?: string[];
}

const querySchema = schema.object({
  pattern: schema.string(),
  meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
    defaultValue: [],
  }),
  type: schema.maybe(schema.string()),
  rollup_index: schema.maybe(schema.string()),
  allow_no_index: schema.maybe(schema.boolean()),
  include_unmapped: schema.maybe(schema.boolean()),
  fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
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
});

const validate: FullValidationConfig<any, any, any> = {
  request: {
    query: querySchema,
    // not available to get request
    body: schema.maybe(schema.object({ index_filter: schema.any() })),
  },
  response: {
    200: {
      body: schema.object({
        fields: schema.arrayOf(FieldDescriptorSchema),
        indices: schema.arrayOf(schema.string()),
      }),
    },
  },
};

const handler: (isRollupsEnabled: () => boolean) => RequestHandler<{}, IQuery, IBody> =
  (isRollupsEnabled) => async (context, request, response) => {
    const { asCurrentUser } = (await context.core).elasticsearch.client;
    const indexPatterns = new IndexPatternsFetcher(asCurrentUser, undefined, isRollupsEnabled());
    const {
      pattern,
      meta_fields: metaFields,
      type,
      rollup_index: rollupIndex,
      allow_no_index: allowNoIndex,
      include_unmapped: includeUnmapped,
    } = request.query;

    // not available to get request
    const indexFilter = request.body?.index_filter;

    let parsedFields: string[] = [];
    let parsedMetaFields: string[] = [];
    try {
      parsedMetaFields = parseFields(metaFields);
      parsedFields = parseFields(request.query.fields ?? []);
    } catch (error) {
      return response.badRequest();
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
        indexFilter,
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

export const registerFieldForWildcard = async (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  isRollupsEnabled: () => boolean
) => {
  const configuredHandler = handler(isRollupsEnabled);

  // handler
  router.versioned.put({ path, access }).addVersion({ version, validate }, configuredHandler);
  router.versioned.post({ path, access }).addVersion({ version, validate }, configuredHandler);
  router.versioned
    .get({ path, access })
    .addVersion(
      { version, validate: { request: { query: querySchema }, response: validate.response } },
      configuredHandler
    );
};
