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
import type { EnterForeachNodeConfiguration } from '@kbn/workflows/graph';
import { z } from '@kbn/zod';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { VARIABLE_REGEX } from '../../../../common/lib/regex';
import {
  getDetailedTypeDescription,
  getSchemaAtPath,
  getZodTypeName,
  inferZodType,
} from '../../../../common/lib/zod';

const extractForeachItemSchemaFromJson = (foreachParam: string) => {
  try {
    const json = JSON.parse(foreachParam);
    if (!Array.isArray(json)) {
      return z.any().describe(`Expected array for foreach iteration, but got: ${typeof json}`);
    }
    if (json.length > 0) {
      return inferZodType(json[0]);
    }
    return z.any().describe('Expected non-empty array for foreach iteration');
  } catch (e) {
    return z.any().describe('Unable to parse foreach parameter as JSON');
  }
};

export function getForeachItemSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  foreachParam: string
) {
  const parsedPath = parseVariablePath(foreachParam);
  const iterateOverPath = parsedPath?.propertyPath;

  // If we have a valid variable path syntax (e.g., {{some.path}})
  if (parsedPath && !parsedPath.errors && iterateOverPath) {
    let itemSchema: z.ZodType = z.unknown().describe('Unable to parse foreach parameter'); // we need this constant to have references in json schema
    const { schema: iterableSchema } = getSchemaAtPath(stepContextSchema, iterateOverPath);
    if (!iterableSchema) {
      // if we cannot resolve the path in the schema, we return an unknown schema
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
      return z.any().describe('Unable to determine foreach item type');
    } else if (iterableSchema instanceof z.ZodUnion) {
      const arrayOption = iterableSchema.options.find(
        (option: z.ZodType) => option instanceof z.ZodArray
      );
      if (arrayOption && arrayOption instanceof z.ZodArray) {
        return arrayOption.element;
      } else {
        return z
          .any()
          .describe(
            `Expected array in union for foreach iteration, but no array type was found. Union options: [${iterableSchema.options
              .map((opt) => getZodTypeName(opt))
              .join(', ')}]`
          );
      }
    } else {
      return z
        .any()
        .describe(
          `Expected array for foreach iteration, but got ${getZodTypeName(
            iterableSchema
          )} (${getDetailedTypeDescription(iterableSchema)})`
        );
    }
  } else {
    // Not a valid variable path syntax or has errors, try to parse as JSON
    return extractForeachItemSchemaFromJson(foreachParam);
  }
}

export function getForeachStateSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  foreachStep: EnterForeachNodeConfiguration
) {
  let itemSchema: z.ZodType = z.unknown();
  const cleanedForeachParam =
    foreachStep.foreach.match(VARIABLE_REGEX)?.groups?.key ?? foreachStep.foreach;
  itemSchema = getForeachItemSchema(stepContextSchema, cleanedForeachParam);
  return ForEachContextSchema.extend({
    item: itemSchema,
    items: z.array(itemSchema),
  });
}
