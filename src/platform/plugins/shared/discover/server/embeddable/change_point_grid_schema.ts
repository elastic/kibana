/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { ESQLVariableType } from '@kbn/esql-types';
import { BY_VALUE_SCHEMA_META, serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

const MAX_ESQL_LENGTH = 10_000;
const MAX_TEXT_LENGTH = 2_048;
const MAX_FIELD_LENGTH = 256;
const MAX_FILTERS = 100;
const MAX_VARIABLES = 50;
const MAX_VARIABLE_VALUES = 100;

const variableValueSchema = lazySchema(() =>
  z.union([
    z.string().max(MAX_TEXT_LENGTH),
    z.number(),
    z.array(z.union([z.string().max(MAX_TEXT_LENGTH), z.number()])).max(MAX_VARIABLE_VALUES),
  ])
);

const esqlVariableSchema = lazySchema(() =>
  z
    .object({
      key: z.string().max(MAX_FIELD_LENGTH),
      value: variableValueSchema,
      type: z.enum([
        ESQLVariableType.TIME_LITERAL,
        ESQLVariableType.FIELDS,
        ESQLVariableType.VALUES,
        ESQLVariableType.MULTI_VALUES,
        ESQLVariableType.FUNCTIONS,
      ]),
    })
    .strip()
);

const timeRangeSchema = lazySchema(() =>
  z
    .object({
      from: z.string().max(128).meta({
        description:
          'The start of the time range. Accepts date math (for example, now-7d) or an ISO 8601 timestamp.',
      }),
      to: z.string().max(128).meta({
        description:
          'The end of the time range. Accepts date math (for example, now) or an ISO 8601 timestamp.',
      }),
      mode: z.enum(['absolute', 'relative']).optional().meta({
        description:
          'Use absolute for fixed timestamps, or relative for date math that is re-evaluated at query time.',
      }),
    })
    .strict()
);

const changePointGridStaticContextSchema = lazySchema(() =>
  z
    .object({
      filters: z.array(asCodeFilterSchema).max(MAX_FILTERS).optional().meta({
        description: 'Filters captured from Discover.',
      }),
      query: asCodeQuerySchema.optional().meta({
        description: 'KQL or Lucene query captured from Discover.',
      }),
      esql_variables: z.array(esqlVariableSchema).max(MAX_VARIABLES).optional().meta({
        description: 'ES|QL variable values captured from Discover.',
      }),
    })
    .strip()
);

export const changePointGridEmbeddableSchema = lazySchema(() =>
  z
    .object({
      ...serializedTitlesSchema.shape,
      time_range: timeRangeSchema.optional().meta({
        description: 'Panel time range. When set, it overrides the dashboard time range.',
      }),
      esql: z.string().max(MAX_ESQL_LENGTH).meta({
        description: 'The ES|QL query that detects the change points.',
      }),
      apply_dashboard_context: z.boolean().default(true).meta({
        description:
          'When true, the panel uses the dashboard filters, query, and ES|QL variables. When false, it uses static_context.',
      }),
      static_context: changePointGridStaticContextSchema.optional().meta({
        description:
          'Filters, query, and ES|QL variables captured from Discover. Used only when apply_dashboard_context is false.',
      }),
    })
    .strip()
    .meta(BY_VALUE_SCHEMA_META)
);

export type ChangePointGridEmbeddableState = z.output<typeof changePointGridEmbeddableSchema>;
