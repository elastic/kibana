/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { timeRangeSchema } from '@kbn/es-query-server';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';
import { accessControlSchema } from '../dashboard_state_schemas';

export const searchRequestParamsSchema = z
  .object({
    page: z.coerce.number().optional().meta({
      description: 'The page of results to return. Defaults to `1`.',
    }),
    per_page: z.coerce.number().optional().meta({
      description: 'The number of results to return per page. Defaults to `20`.',
    }),
    query: z.string().optional().meta({
      description:
        'Filters results by `title` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/simple-query-string-query) syntax. Multi-word terms require all words to match.',
    }),
    tags: z
      .union([z.string(), z.array(z.string()).max(100)])
      .optional()
      .meta({
        description:
          'A tag ID to include. Accepts a single tag ID or multiple tag IDs. When multiple are specified, dashboards matching any of the tag IDs are included.',
      }),
    excluded_tags: z
      .union([z.string(), z.array(z.string()).max(100)])
      .optional()
      .meta({
        description:
          'A tag ID to exclude. Accepts a single tag ID or multiple tag IDs. When multiple are specified, dashboards matching any of the tag IDs are excluded.',
      }),
  })
  .strict();

export const searchResponseBodySchema = z
  .object({
    dashboards: z
      .array(
        z
          .object({
            id: z.string().meta({ description: 'The dashboard ID.' }),
            data: z
              .object({
                description: z
                  .string()
                  .optional()
                  .meta({ description: 'A short description of the dashboard.' }),
                tags: z
                  .array(z.string())
                  .max(100)
                  .optional()
                  .meta({ description: 'Tag IDs associated with this dashboard.' }),
                time_range: timeRangeSchema.optional(),
                title: z.string().meta({ description: 'The dashboard title.' }),
                access_control: accessControlSchema,
              })
              .strict(),
            meta: asCodeMetaSchema,
          })
          .strict()
      )
      .meta({
        description:
          'List of dashboards matching the query. Each entry includes summary fields but not the full panel layout.',
      }),
    total: z.number().meta({ description: 'The total number of dashboards matching the query.' }),
    page: z.number().meta({ description: 'The current page number.' }),
  })
  .strict();
