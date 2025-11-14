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
import { dashboardMetaSchema } from '../../content_management/v1/schema';

export const searchRequestBody = schema.object({
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
  search: schema.maybe(
    schema.string({
      meta: {
        description:
          'An Elasticsearch simple_query_string query that filters the dashboards in the response by "title" and "description"',
      },
    })
  ),
  tags: schema.maybe(
    schema.object({
      included: schema.maybe(schema.arrayOf(schema.string())),
      excluded: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
});

export const searchResponseBody = schema.object({
  dashboards: schema.arrayOf(
    schema.object({
      id: schema.string(),
      data: schema.object({
        description: schema.maybe(schema.string()),
        tags: schema.maybe(schema.arrayOf(schema.string())),
        timeRange: schema.maybe(timeRangeSchema),
        title: schema.string(),
        accessControl: schema.maybe(
          schema.object({
            owner: schema.maybe(schema.string()),
            accessMode: schema.maybe(
              schema.oneOf([schema.literal('default'), schema.literal('write_restricted')])
            ),
          })
        ),
      }),
      meta: dashboardMetaSchema,
    })
  ),
  total: schema.number(),
  page: schema.number(),
});
