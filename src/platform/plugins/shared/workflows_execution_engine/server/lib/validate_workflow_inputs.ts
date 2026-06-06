/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { SerializedError, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  applyInputDefaults,
  getInputsFromDefinition,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Toggleable feature flags for this module. Exposed as a mutable container so
 * downstream code (and tests) can flip behavior without re-plumbing config.
 */
export const featureFlags = {
  /**
   * When true, retry the FAILED-status update with a stringified `error` field
   * if the structured-object update fails with `document_parsing_exception`.
   *
   * Targets legacy `.workflows-executions` indices (created before PR #243395,
   * 2025-12-02) that have `error` mapped as `text`. Without this fallback, the
   * execution doc is never flipped to FAILED on those projects and the run
   * appears stuck in its initial status.
   */
  legacyErrorMappingFallback: false,
};

const isDocumentParsingException = (err: unknown): boolean => {
  const meta = (err as { meta?: { body?: { error?: { type?: string } } } } | undefined)?.meta;
  return meta?.body?.error?.type === 'document_parsing_exception';
};

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
  if (!workflow.definition) {
    return true;
  }
  const normalizedSchema = getInputsFromDefinition(workflow.definition);
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

    const errorPayload: SerializedError = {
      type: 'InputValidationError',
      message: `Workflow input validation failed: ${issues}`,
    };

    try {
      await workflowExecutionRepository.updateWorkflowExecution({
        id: executionId,
        status: ExecutionStatus.FAILED,
        error: errorPayload,
      });
    } catch (updateError) {
      if (featureFlags.legacyErrorMappingFallback && isDocumentParsingException(updateError)) {
        try {
          // Legacy `.workflows-executions` indices (pre-PR #243395) have
          // `error` mapped as `text`, so retry with a stringified payload to
          // coerce into the legacy mapping. Cast is required because
          // EsWorkflowExecution.error is typed as SerializedError | null.
          await workflowExecutionRepository.updateWorkflowExecution({
            id: executionId,
            status: ExecutionStatus.FAILED,
            error: JSON.stringify(errorPayload) as unknown as SerializedError,
          });
        } catch (retryError) {
          logger.error(
            `Failed to mark execution ${executionId} as FAILED after input validation error (legacy fallback retry also failed): ${retryError}`
          );
        }
      } else {
        logger.error(
          `Failed to mark execution ${executionId} as FAILED after input validation error: ${updateError}`
        );
      }
    }

    return false;
  }

  return true;
};
