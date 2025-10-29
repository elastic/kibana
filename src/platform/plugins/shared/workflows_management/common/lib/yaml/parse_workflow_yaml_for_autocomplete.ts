/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowSchemaForAutocomplete } from '@kbn/workflows';
import type { z } from '@kbn/zod';
import { dangerouslyParseWorkflowYamlToJSON } from './dangerously_parse_workflow_yaml_to_json';
import { InvalidYamlSchemaError } from '../errors';
import { formatZodError } from '../zod/format_zod_error';

export function parseWorkflowYamlForAutocomplete(
  yamlString: string
):
  | z.SafeParseReturnType<
      z.input<typeof WorkflowSchemaForAutocomplete>,
      z.output<typeof WorkflowSchemaForAutocomplete>
    >
  | { success: false; error: Error } {
  const dangerouslyParseResult = dangerouslyParseWorkflowYamlToJSON(yamlString);
  if (!dangerouslyParseResult.success) {
    return {
      success: false,
      error: dangerouslyParseResult.error,
    };
  }
  const json = dangerouslyParseResult.json;
  const result = WorkflowSchemaForAutocomplete.safeParse(json);
  if (!result.success) {
    // Use custom error formatter for better user experience
    const { message, formattedError } = formatZodError(
      result.error,
      WorkflowSchemaForAutocomplete,
      dangerouslyParseResult.document
    );
    return {
      success: false,
      error: new InvalidYamlSchemaError(message, formattedError),
    };
  }
  return result;
}
