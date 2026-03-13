/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicStepContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { inferZodType } from '../../../../common/lib/zod';
import { VARIABLE_REGEX } from '../../../../common/lib/regex';
import { InvalidForeachParameterError } from './errors';
import { getForeachItemSchema } from './get_foreach_state_schema';

interface DataMapContextSchemaEntries {
  item: z.ZodType;
  index: z.ZodType;
}

/**
 * Derives `item` and `index` schemas for a `data.map` step.
 *
 * The `items` config behaves like `foreach` — it can be a literal array or a
 * variable reference — so we reuse `getForeachItemSchema` for type derivation.
 */
export function getDataMapContextSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  items: unknown
): DataMapContextSchemaEntries {
  let itemSchema: z.ZodType = z.unknown();

  try {
    if (Array.isArray(items)) {
      if (items.length > 0) {
        itemSchema = inferZodType(items[0]);
      }
    } else if (typeof items === 'string') {
      const cleanedParam = items.match(VARIABLE_REGEX)?.groups?.key ?? items;
      itemSchema = getForeachItemSchema(stepContextSchema, cleanedParam);
    }
  } catch (error) {
    if (error instanceof InvalidForeachParameterError) {
      itemSchema = z.unknown().describe(error.message);
    } else {
      throw error;
    }
  }

  return {
    item: itemSchema,
    index: z.number(),
  };
}
