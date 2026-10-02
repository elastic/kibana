/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import {
  asCodeQuerySchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '@kbn/as-code-shared-schemas';

export const vegaSpecSchema = z
  .discriminatedUnion('format', [
    z.object({
      format: z.literal('hjson'),
      value: z.string().min(1).meta({
        description:
          'The Vega or Vega-Lite specification in HJSON format. Comments and unquoted keys are preserved.',
      }),
    }),
    z.object({
      format: z.literal('json'),
      value: z.looseObject({}).meta({
        description: 'The Vega or Vega-Lite specification as a JSON object.',
      }),
    }),
  ])
  .meta({
    description:
      'The Vega or Vega-Lite specification. Use `{ "format": "hjson", "value": "<hjson-string>" }` for HJSON (comments and unquoted keys are preserved) or `{ "format": "json", "value": { ... } }` for a JSON object.',
  });

export const vegaLibraryItemSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(MAX_TITLE_LENGTH)
      .meta({ description: 'The Vega library item title.' }),
    description: z
      .string()
      .max(MAX_DESCRIPTION_LENGTH)
      .optional()
      .meta({ description: 'A short description of the Vega library item.' }),
    spec: vegaSpecSchema,
    query: asCodeQuerySchema.optional().meta({
      description:
        'KQL or Lucene query. Applied together with the dashboard query to Elasticsearch and ES|QL data sources that use `%context%: true`, and to Elasticsearch data sources that use `%dashboard_context-*%` placeholders.',
    }),
    filters: z.array(asCodeFilterSchema).max(100).optional().meta({
      description:
        'Filters. Applied together with the dashboard filters to Elasticsearch and ES|QL data sources that use `%context%: true`, and to Elasticsearch data sources that use `%dashboard_context-*%` placeholders.',
    }),
  })
  .strict();

export type VegaLibraryItemState = z.output<typeof vegaLibraryItemSchema>;
