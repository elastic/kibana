/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { baseMetaSchema, createdMetaSchema, updatedMetaSchema } from '../meta_schemas';

const MAX_PER_PAGE = 10000;

export const searchRequestBodySchema = schema.object({
  page: schema.maybe(
    schema.number({
      meta: {
        description: 'The page of markdown panels to return',
      },
    })
  ),
  per_page: schema.maybe(
    schema.number({
      meta: {
        description: 'The number of markdown panels to return per page',
      },
      max: MAX_PER_PAGE,
    })
  ),
  search: schema.maybe(
    schema.string({
      meta: {
        description:
          'An Elasticsearch simple_query_string query that filters the markdown panels in the response by "title" and "description"',
      },
    })
  ),
});

export const searchResponseBodySchema = schema.object({
  markdowns: schema.arrayOf(
    schema.object({
      id: schema.string(),
      data: schema.object({
        description: schema.maybe(schema.string()),
        title: schema.string(),
      }),
      meta: schema.allOf([baseMetaSchema, createdMetaSchema, updatedMetaSchema]),
    }),
    { minSize: 0, maxSize: MAX_PER_PAGE }
  ),
  total: schema.number(),
  page: schema.number(),
});
