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
    .strict()
);

const timeRangeSchema = lazySchema(() =>
  z
    .object({
      from: z.string().max(128),
      to: z.string().max(128),
      mode: z.enum(['absolute', 'relative']).optional(),
    })
    .strict()
);

const changePointGridStaticContextSchema = lazySchema(() =>
  z
    .object({
      filters: z.array(asCodeFilterSchema).max(MAX_FILTERS).optional(),
      query: asCodeQuerySchema.optional(),
      esql_variables: z.array(esqlVariableSchema).max(MAX_VARIABLES).optional(),
    })
    .strict()
);

export const changePointGridEmbeddableSchema = lazySchema(() =>
  z
    .object({
      ...serializedTitlesSchema.shape,
      time_range: timeRangeSchema.optional(),
      esql: z.string().max(MAX_ESQL_LENGTH),
      apply_dashboard_context: z.boolean().default(true),
      static_context: changePointGridStaticContextSchema.optional(),
    })
    .strict()
    .meta(BY_VALUE_SCHEMA_META)
);

export type ChangePointGridEmbeddableState = z.output<typeof changePointGridEmbeddableSchema>;
