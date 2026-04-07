/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  applyInputDefaults,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Validates workflow inputs against the workflow's input schema.
 * On failure, marks the execution as FAILED with an InputValidationError.
 *
 * @returns true if inputs are valid and execution can proceed, false if validation failed
 */
export const validateWorkflowInputs = async (
  workflow: WorkflowExecutionEngineModel,
  context: Record<string, unknown>,
  executionId: string,
  workflowExecutionRepository: WorkflowExecutionRepository,
  logger: Logger
): Promise<boolean> => {
  const inputsDef = workflow.definition?.inputs;
  if (!inputsDef) {
    return true;
  }
  const normalizedSchema = normalizeFieldsToJsonSchema(inputsDef);
  const validator = buildFieldsZodValidator(normalizedSchema);
  if (!normalizedSchema?.properties) {
    return true;
  }
  const providedInputs: Record<string, unknown> | undefined =
    typeof context.inputs === 'object' && context.inputs !== null
      ? (context.inputs as Record<string, unknown>)
      : undefined;
  const inputsWithDefaults = applyInputDefaults(providedInputs, normalizedSchema);
  const result = validator.safeParse(inputsWithDefaults ?? {});
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    try {
      await workflowExecutionRepository.updateWorkflowExecution({
        id: executionId,
        status: ExecutionStatus.FAILED,
        error: {
          type: 'InputValidationError',
          message: `Workflow input validation failed: ${issues}`,
        },
      });
    } catch (updateError) {
      logger.error(
        `Failed to mark execution ${executionId} as FAILED after input validation error: ${updateError}`
      );
    }

    return false;
  }

  return true;
};
