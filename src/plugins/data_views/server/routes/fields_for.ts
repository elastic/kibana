/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandler,
  RouteValidatorFullConfig,
  StartServicesAccessor,
} from '@kbn/core/server';
import { IndexPatternsFetcher } from '../fetcher';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../types';

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

const path = '/api/index_patterns/_fields_for_wildcard';

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

const validate: RouteValidatorFullConfig<{}, IQuery, IBody> = {
  query: schema.object({
    pattern: schema.string(),
    meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
      defaultValue: [],
    }),
    type: schema.maybe(schema.string()),
    rollup_index: schema.maybe(schema.string()),
    allow_no_index: schema.maybe(schema.boolean()),
    include_unmapped: schema.maybe(schema.boolean()),
    fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  }),
  // not available to get request
  body: schema.maybe(schema.object({ index_filter: schema.any() })),
};
const handler: RequestHandler<{}, IQuery, IBody> = async (context, request, response) => {
  const { asCurrentUser } = (await context.core).elasticsearch.client;
  const indexPatterns = new IndexPatternsFetcher(asCurrentUser);
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

    return response.ok({
      body: { fields, indices },
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
  >
) => {
  router.put({ path, validate }, handler);
  router.post({ path, validate }, handler);
  router.get({ path, validate }, handler);
};
