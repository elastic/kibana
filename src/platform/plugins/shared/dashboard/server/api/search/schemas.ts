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
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';
import { accessControlSchema } from '../dashboard_state_schemas';

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
  sort_field: schema.maybe(
    schema.oneOf([schema.literal('updated_at'), schema.literal('created_at')], {
      meta: {
        description:
          'An optional field to sort results by. When `query` is specified, omitting `sort_field` returns results in relevance order; providing `sort_field` overrides relevance ordering. When `query` is not specified, omitting `sort_field` defaults to `updated_at` descending.',
      },
    })
  ),
  sort_order: schema.maybe(
    schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      meta: {
        description:
          'The sort direction used with `sort_field`. Ignored when `sort_field` is not provided. Defaults to `desc` when `sort_field` is provided.',
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
      meta: asCodeMetaSchema,
    })
  ),
  total: schema.number(),
  page: schema.number(),
});
