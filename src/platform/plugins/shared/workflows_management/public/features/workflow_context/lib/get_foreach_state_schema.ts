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
import {
  getDetailedTypeDescription,
  getSchemaAtPath,
  inferZodType,
} from '../../../../common/lib/zod';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';

const extractForeachItemSchemaFromJson = (foreachParam: string) => {
  try {
    const json = JSON.parse(foreachParam);
    if (!Array.isArray(json)) {
      throw new Error('Foreach step must iterate over an array type, but received an object');
    }
    if (json.length > 0) {
      return inferZodType(json[0]);
    }
    throw new Error('Foreach step must iterate over an array type, but received an empty array');
  } catch (e) {
    throw new Error(
      'Foreach step must iterate over an array type, but received no valid path or JSON string'
    );
  }
};

export function getForeachItemSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  foreachParam: string
) {
  const iterateOverPath = parseVariablePath(foreachParam)?.propertyPath;
  if (!iterateOverPath) {
    // if we cannot resolve the path, we try to parse the string as JSON
    return extractForeachItemSchemaFromJson(foreachParam);
  }
  let itemSchema: z.ZodType = z.unknown(); // we need this constant to have references in json schema
  const iterableSchema = getSchemaAtPath(stepContextSchema, iterateOverPath);
  if (!iterableSchema) {
    // if we cannot resolve the path and cannot parse the string as JSON, we return an unknown schema
    return itemSchema;
  }
  if (iterableSchema instanceof z.ZodArray) {
    itemSchema = iterableSchema.element;
    return itemSchema;
  } else if (iterableSchema instanceof z.ZodLiteral) {
    // If the resolved path is a known literal string, we need to try to parse it as JSON
    return extractForeachItemSchemaFromJson(iterableSchema.value);
  } else if (iterableSchema instanceof z.ZodString) {
    // If the resolved path is a string, we return a string schema and will tell the user we will try to parse it as JSON in runtime
    return z.any().describe('Foreach item type is unknown');
  } else {
    throw new Error(
      `Foreach step must iterate over an array type, but received: ${getDetailedTypeDescription(
        iterableSchema
      )}`
    );
  }
}

export function getForeachStateSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  foreachStep: EnterForeachNodeConfiguration
) {
  let itemSchema: z.ZodType = z.unknown();
  itemSchema = getForeachItemSchema(stepContextSchema, foreachStep.foreach);
  return ForEachContextSchema.extend({
    item: itemSchema,
    items: z.array(itemSchema),
  });
}
