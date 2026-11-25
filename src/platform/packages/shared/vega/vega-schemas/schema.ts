/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, searchFilter, lazySchema } from '@kbn/zod';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { VEGA_MAX_FILTERS } from '@kbn/vega-constants';

export const vegaSpecSchema = z
  .discriminatedUnion('format', [
    z
      .object({
        format: z.literal('hjson'),
        value: z.string().min(1).max(1_000_000).meta({
          description:
            'The Vega or Vega-Lite specification in HJSON format. Comments and unquoted keys are preserved.',
        }),
      })
      .meta({ title: 'HJSON spec' }),
    z
      .object({
        format: z.literal('json'),
        value: z.looseObject({}).meta({
          description: 'The Vega or Vega-Lite specification as a JSON object.',
        }),
      })
      .meta({ title: 'JSON spec' }),
  ])
  .meta({
    id: 'kbn-vega-spec',
    title: 'Vega spec',
    description:
      'The Vega or Vega-Lite specification. Use `{ "format": "hjson", "value": "<hjson-string>" }` for HJSON (comments and unquoted keys are preserved) or `{ "format": "json", "value": { ... } }` for a JSON object.',
  });

/** A Vega panel or library item spec: an HJSON string or a JSON object. */
export type VegaSpec = z.output<typeof vegaSpecSchema>;

// TODO: Remove the expression override once the shared query schema is bounded (https://github.com/elastic/kibana/issues/299890)
export const vegaQuerySchema = asCodeQuerySchema
  .extend({
    expression: searchFilter({ maxLength: 1_000_000 }).meta({
      description: 'A query expression in KQL or Lucene syntax.',
    }),
  })
  .optional();

export const vegaFiltersSchema = lazySchema(() =>
  z.array(asCodeFilterSchema).max(VEGA_MAX_FILTERS).optional()
);
