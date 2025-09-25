/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicStepContextSchema } from '@kbn/workflows';
import { ForEachContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod';
import type { EnterForeachNodeConfiguration } from '@kbn/workflows/graph';
import { getDetailedTypeDescription, getSchemaAtPath } from '../../../../common/lib/zod';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';

export function getForeachStateSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  foreachStep: EnterForeachNodeConfiguration
) {
  const itemSchema = z.unknown();
  const iterateOverPath =
    parseVariablePath(foreachStep.foreach)?.propertyPath || foreachStep.foreach;
  let iterableSchema = getSchemaAtPath(stepContextSchema, iterateOverPath);
  if (!iterableSchema) {
    return ForEachContextSchema.extend({
      item: itemSchema,
      items: z.array(itemSchema),
    });
  }
  if (iterableSchema instanceof z.ZodArray) {
    iterableSchema = iterableSchema.element;
  } else {
    throw new Error(
      `Foreach step must iterate over an array type, but received: ${getDetailedTypeDescription(
        iterableSchema
      )}`
    );
  }
  return ForEachContextSchema.extend({
    item: itemSchema,
    items: z.array(itemSchema),
  });
}
