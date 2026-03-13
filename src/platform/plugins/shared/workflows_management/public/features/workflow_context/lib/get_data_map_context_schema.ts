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
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { VARIABLE_REGEX } from '../../../../common/lib/regex';
import { getSchemaAtPath, inferZodType } from '../../../../common/lib/zod';

interface DataMapContextSchemaEntries {
  item: z.ZodType;
  index: z.ZodType;
}

/**
 * Derives `item` and `index` schemas for a `data.map` step.
 *
 * Unlike `foreach`, `data.map` only accepts literal arrays or `${{ }}`
 * template variable references — no JSON strings or complex expressions.
 */
export function getDataMapContextSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  items: unknown
): DataMapContextSchemaEntries {
  return {
    item: getDataMapItemSchema(stepContextSchema, items),
    index: z.number(),
  };
}

function getDataMapItemSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  items: unknown
): z.ZodType {
  if (Array.isArray(items) && items.length > 0) {
    return inferZodType(items[0]);
  }

  if (typeof items !== 'string') {
    return z.unknown();
  }

  const variableKey = items.match(VARIABLE_REGEX)?.groups?.key;
  if (!variableKey) {
    return z.unknown();
  }

  const parsedPath = parseVariablePath(variableKey);
  if (!parsedPath || parsedPath.errors || !parsedPath.propertyPath) {
    return z.unknown();
  }

  const { schema: iterableSchema } = getSchemaAtPath(stepContextSchema, parsedPath.propertyPath);
  if (iterableSchema instanceof z.ZodArray) {
    return iterableSchema.element as z.ZodType;
  }

  return z.unknown();
}
