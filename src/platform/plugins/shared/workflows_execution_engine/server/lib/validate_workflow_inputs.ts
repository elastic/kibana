/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  applyInputDefaults,
  getInputsFromDefinition,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { WorkflowTemplatingEngine } from '../templating_engine';
import { buildInputDefaultRenderContext } from '../workflow_context_manager/build_workflow_context';
import type { ContextDependencies } from '../workflow_context_manager/types';

/**
 * Validates workflow inputs against the workflow's input schema.
 * On failure, marks the execution as FAILED with an InputValidationError.
 *
 * @returns true if inputs are valid and execution can proceed, false if validation failed
 */
export const validateWorkflowInputs = async (
  workflowExecution: Partial<EsWorkflowExecution>,
  workflowExecutionRepository: WorkflowExecutionRepository,
  logger: Logger,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): Promise<boolean> => {
  if (!workflowExecution.id) {
    throw new Error('Workflow execution ID is required for input validation');
  }

  if (!workflowExecution.workflowDefinition) {
    return true;
  }
  const normalizedSchema = getInputsFromDefinition(workflowExecution.workflowDefinition);
  const validator = buildFieldsZodValidator(normalizedSchema);
  if (!normalizedSchema?.properties) {
    return true;
  }
  const renderContext = buildInputDefaultRenderContext(workflowExecution, coreStart, dependencies);
  const templateEngine = new WorkflowTemplatingEngine();
  let inputsWithDefaults: Record<string, unknown> | undefined;
  try {
    inputsWithDefaults = applyInputDefaults(renderContext.inputs, normalizedSchema, (value) =>
      templateEngine.render(value, renderContext)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowExecution.id,
        status: ExecutionStatus.FAILED,
        error: {
          type: 'InputValidationError',
          message: `Workflow input validation failed: ${message}`,
        },
      });
    } catch (updateError) {
      logger.error(
        `Failed to mark execution ${workflowExecution.id} as FAILED after input validation error: ${updateError}`
      );
    }
    return false;
  }
  const result = validator.safeParse(inputsWithDefaults ?? {});
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    try {
      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowExecution.id,
        status: ExecutionStatus.FAILED,
        error: {
          type: 'InputValidationError',
          message: `Workflow input validation failed: ${issues}`,
        },
      });
    } catch (updateError) {
      logger.error(
        `Failed to mark execution ${workflowExecution.id} as FAILED after input validation error: ${updateError}`
      );
    }

    return false;
  }

  return true;
};
