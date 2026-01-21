/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodSafeParseResult, ZodType } from '@kbn/zod/v4';
import { ZodError } from '@kbn/zod/v4';
import { parseYamlToJSONWithoutValidation } from './parse_workflow_yaml_to_json_without_validation';
import { getYamlDocumentErrors } from './validate_yaml_document';
import { InvalidYamlSchemaError, InvalidYamlSyntaxError } from '../errors';
import { isDynamicValue, isLiquidTagValue, isVariableValue } from '../regex';
import { formatZodError } from '../zod/format_zod_error';

export function parseWorkflowYamlToJSON<T extends ZodType>(
  yamlString: string,
  schema: T
): ZodSafeParseResult<T> | { success: false; error: Error } {
  const parseResult = parseYamlToJSONWithoutValidation(yamlString);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error,
    };
  }
  const yamlDocumentErrors = getYamlDocumentErrors(parseResult.document);
  if (yamlDocumentErrors.length > 0) {
    return {
      success: false,
      error: new InvalidYamlSyntaxError(yamlDocumentErrors.map((err) => err.message).join(', ')),
    };
  }
  const result = schema.safeParse(parseResult.json);
  if (!result.success) {
    // Filter out validation errors for dynamic values (${{ }}), variable values ({{ }}), and Liquid tags ({% ... %})
    const filteredIssues = result.error.issues.filter((issue) => {
      if (!issue.path || issue.path.length === 0) {
        return true;
      }

      // Get value from parsed JSON at the error path
      let value: unknown = parseResult.json;
      for (const segment of issue.path) {
        if (value == null || typeof value !== 'object') {
          return true; // Keep error if path is invalid
        }
        value = (value as Record<string, unknown>)[segment as string];
      }

      const shouldSuppressError =
        isDynamicValue(value) || isVariableValue(value) || isLiquidTagValue(value);

      // Suppress error if value is a dynamic template, variable value, or Liquid tag
      return !shouldSuppressError;
    });

    if (filteredIssues.length === 0) {
      return {
        success: true,
        data: parseResult.json as T['_output'],
      } as ZodSafeParseResult<T>;
    }

    // Use custom error formatter for better user experience
    const filteredError = new ZodError(filteredIssues);
    const { message, formattedError } = formatZodError(filteredError, schema, parseResult.document);
    return {
      success: false,
      error: new InvalidYamlSchemaError(message, formattedError),
    };
  }
  return result as ZodSafeParseResult<T>;
}
