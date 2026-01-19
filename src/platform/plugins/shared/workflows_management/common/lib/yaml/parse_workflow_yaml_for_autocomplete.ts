/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowSchemaForAutocomplete } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { parseYamlToJSONWithoutValidation } from './parse_workflow_yaml_to_json_without_validation';
import { InvalidYamlSchemaError } from '../errors';
import { formatZodError } from '../zod/format_zod_error';

export function parseWorkflowYamlForAutocomplete(
  yamlString: string
):
  | z.ZodSafeParseResult<z.input<typeof WorkflowSchemaForAutocomplete>>
  | { success: false; error: Error } {
  const parseResult = parseYamlToJSONWithoutValidation(yamlString);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error,
    };
  }
  const json = parseResult.json;
  const result = WorkflowSchemaForAutocomplete.safeParse(json);
  if (!result.success) {
    // Use custom error formatter for better user experience
    const { message, formattedError } = formatZodError(
      result.error,
      WorkflowSchemaForAutocomplete,
      parseResult.document
    );
    return {
      success: false,
      error: new InvalidYamlSchemaError(message, formattedError),
    };
  }
  return result;
}
