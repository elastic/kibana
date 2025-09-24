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
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { getSchemaAtPath, getZodTypeName } from '../../../../common/lib/zod_utils';

export function getForeachStateSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  foreachStep: EnterForeachNodeConfiguration
) {
  const iterateOverPath =
    parseVariablePath(foreachStep.foreach)?.propertyPath || foreachStep.foreach;
  let itemSchema = getSchemaAtPath(stepContextSchema, iterateOverPath);
  if (!itemSchema) {
    // TODO: indicate in the UI that we can't infer the type of the item
    itemSchema = z.any();
  } else if (itemSchema instanceof z.ZodArray) {
    itemSchema = itemSchema.element;
  } else {
    throw new Error(
      `Foreach step must iterate over an array type, but received: ${getZodTypeName(itemSchema)}`
    );
  }
  return ForEachContextSchema.extend({
    item: itemSchema,
    items: z.array(itemSchema),
  });
}
