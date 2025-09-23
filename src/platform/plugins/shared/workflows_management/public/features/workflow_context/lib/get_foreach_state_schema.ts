/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ForEachStep } from '@kbn/workflows';
import { ForEachContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { getSchemaAtPath } from '../../../../common/lib/zod_utils';

export function getForeachStateSchema(stepContextSchema: z.ZodType, foreachStep: ForEachStep) {
  const iterateOverPath =
    parseVariablePath(foreachStep.foreach)?.propertyPath || foreachStep.foreach;
  let itemSchema = getSchemaAtPath(stepContextSchema, iterateOverPath);
  if (!itemSchema) {
    itemSchema = z.any();
  } else if (itemSchema instanceof z.ZodArray) {
    itemSchema = itemSchema.element;
  } else {
    throw new Error('Foreach configuration must be an array');
  }
  return ForEachContextSchema.extend({
    item: itemSchema,
    items: z.array(itemSchema),
  });
}
