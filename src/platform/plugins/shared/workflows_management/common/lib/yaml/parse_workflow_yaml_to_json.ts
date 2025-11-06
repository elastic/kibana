/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { parseYamlToJSONWithoutValidation } from './parse_workflow_yaml_to_json_without_validation';
import { getYamlDocumentErrors } from './validate_yaml_document';
import { InvalidYamlSchemaError, InvalidYamlSyntaxError } from '../errors';
import { formatZodError } from '../zod/format_zod_error';

export function parseWorkflowYamlToJSON<T extends z.ZodSchema>(
  yamlString: string,
  schema: T
): z.SafeParseReturnType<z.input<T>, z.output<T>> | { success: false; error: Error } {
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
    // Use custom error formatter for better user experience
    const { message, formattedError } = formatZodError(result.error, schema, parseResult.document);
    return {
      success: false,
      error: new InvalidYamlSchemaError(message, formattedError),
    };
  }
  return result;
}
