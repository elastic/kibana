/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import {
  IRouter,
  StartServicesAccessor,
  RequestHandler,
  RouteValidatorFullConfig,
} from '../../../../core/server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../types';
import { IndexPatternsFetcher } from '../fetcher';

const parseMetaFields = (metaFields: string | string[]) => {
  let parsedFields: string[] = [];
  if (typeof metaFields === 'string') {
    parsedFields = JSON.parse(metaFields);
  } else {
    parsedFields = metaFields;
  }
  return parsedFields;
};

const path = '/api/index_patterns/_fields_for_wildcard';

type IBody = { index_filter?: any } | undefined;
interface IQuery {
  pattern: string;
  meta_fields: string[];
  type?: string;
  rollup_index?: string;
  allow_no_index?: boolean;
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
  } = request.query;

  // not available to get request
  const filter = request.body?.index_filter;

  let parsedFields: string[] = [];
  try {
    parsedFields = parseMetaFields(metaFields);
  } catch (error) {
    return response.badRequest();
  }

  try {
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern,
      metaFields: parsedFields,
      type,
      rollupIndex,
      fieldCapsOptions: {
        allow_no_indices: allowNoIndex || false,
      },
      filter,
    });

    return response.ok({
      body: { fields },
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
  router.get({ path, validate }, handler);
};
