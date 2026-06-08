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
import { asCodeMetaSchema, asCodeSearchRequestQuerySchema } from '@kbn/as-code-shared-schemas';
import { accessControlSchema } from '../dashboard_state_schemas';

export const searchRequestParamsSchema = schema.object({
  ...asCodeSearchRequestQuerySchema.getPropSchemas(),
  tags: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
      meta: {
        description:
          'A tag ID to include. Accepts a single tag ID or multiple tag IDs. When multiple are specified, dashboards matching any of the tag IDs are included.',
      },
    })
  ),
  excluded_tags: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
      meta: {
        description:
          'A tag ID to exclude. Accepts a single tag ID or multiple tag IDs. When multiple are specified, dashboards matching any of the tag IDs are excluded.',
      },
    })
  ),
});

export const searchResponseBodySchema = schema.object({
  dashboards: schema.arrayOf(
    schema.object({
      id: schema.string({
        meta: { description: 'The dashboard ID.' },
      }),
      data: schema.object({
        description: schema.maybe(
          schema.string({ meta: { description: 'A short description of the dashboard.' } })
        ),
        tags: schema.maybe(
          schema.arrayOf(schema.string(), {
            maxSize: 100,
            meta: { description: 'Tag IDs associated with this dashboard.' },
          })
        ),
        time_range: schema.maybe(timeRangeSchema),
        title: schema.string({ meta: { description: 'The dashboard title.' } }),
        access_control: accessControlSchema,
      }),
      meta: asCodeMetaSchema,
    }),
    {
      meta: {
        description:
          'List of dashboards matching the query. Each entry includes summary fields but not the full panel layout.',
      },
    }
  ),
  total: schema.number({
    meta: { description: 'The total number of dashboards matching the query.' },
  }),
  page: schema.number({
    meta: { description: 'The current page number.' },
  }),
});
