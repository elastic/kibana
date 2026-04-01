/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { timeRangeSchema } from '@kbn/es-query-server';
import { accessControlSchema } from '../dashboard_state_schemas';
import { baseMetaSchema, createdMetaSchema, updatedMetaSchema } from '../meta_schemas';

export const searchRequestParamsSchema = schema.object({
  page: schema.maybe(
    schema.number({
      meta: {
        description: 'The page of dashboards to return',
      },
    })
  ),
  per_page: schema.maybe(
    schema.number({
      meta: {
        description: 'The number of dashboards to return per page',
      },
    })
  ),
  query: schema.maybe(
    schema.string({
      meta: {
        description:
          'An Elasticsearch simple_query_string query that filters the dashboards in the response by "title" and "description"',
      },
    })
  ),
  tags: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
      meta: {
        description:
          'A tag ID to include. Accepts a single tag ID or multiple tag IDs. When multiple are specified, dashboards matching ANY of the tag IDs are included.',
      },
    })
  ),
  excluded_tags: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
      meta: {
        description:
          'A tag ID to exclude. Accepts a single tag ID or multiple tag IDs. When multiple are specified, dashboards matching ANY of the tag IDs are excluded.',
      },
    })
  ),
});

export const searchResponseBodySchema = schema.object({
  dashboards: schema.arrayOf(
    schema.object({
      id: schema.string(),
      data: schema.object({
        description: schema.maybe(schema.string()),
        tags: schema.maybe(schema.arrayOf(schema.string())),
        time_range: schema.maybe(timeRangeSchema),
        title: schema.string(),
        access_control: accessControlSchema,
      }),
      meta: schema.allOf([baseMetaSchema, createdMetaSchema, updatedMetaSchema]),
    })
  ),
  total: schema.number(),
  page: schema.number(),
});
