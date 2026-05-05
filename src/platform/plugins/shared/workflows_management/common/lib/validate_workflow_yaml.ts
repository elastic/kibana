/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidateWorkflowResponseDto, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';
import {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  parseWorkflowYamlToJSON,
  validateLiquidTemplate,
} from '@kbn/workflows-yaml';
import type { z } from '@kbn/zod/v4';
import { connectorParamsSchemaResolver } from './connector_params_schema_resolver';
import { validateStepNameUniqueness } from './validate_step_names';
import type { TriggerDefinitionForValidateTriggers } from './validate_triggers';
import { validateTriggers } from './validate_triggers';

export interface ValidateWorkflowYamlOptions {
  triggerDefinitions?: TriggerDefinitionForValidateTriggers[];
}

export function validateWorkflowYaml(
  yaml: string,
  zodSchema: z.ZodType,
  options?: ValidateWorkflowYamlOptions
): ValidateWorkflowResponseDto {
  const diagnostics: WorkflowDiagnostic[] = [];
  let parsedWorkflow: WorkflowYaml | undefined;

  const parseResult = parseWorkflowYamlToJSON(yaml, zodSchema, {
    connectorParamsSchemaResolver,
  });

  if (!parseResult.success) {
    const { error } = parseResult;

    if (error instanceof InvalidYamlSyntaxError) {
      diagnostics.push({ severity: 'error', message: error.message, source: 'yaml-syntax' });
    } else if (error instanceof InvalidYamlSchemaError) {
      if (error.formattedZodError?.issues) {
        for (const issue of error.formattedZodError.issues) {
          diagnostics.push({
            severity: 'error',
            message: issue.message,
            source: 'schema',
            path: issue.path as (string | number)[],
          });
        }
      } else {
        diagnostics.push({ severity: 'error', message: error.message, source: 'schema' });
      }
    } else {
      diagnostics.push({ severity: 'error', message: error.message, source: 'yaml-syntax' });
    }
  }

  if (parseResult.success) {
    parsedWorkflow = parseResult.data as unknown as WorkflowYaml;

    try {
      const stepValidation = validateStepNameUniqueness(parsedWorkflow);
      for (const stepError of stepValidation.errors) {
        diagnostics.push({
          severity: 'error',
          message: stepError.message,
          source: 'step-name',
        });
      }
    } catch {
      // Structure too malformed for step name validation
    }

    if (options?.triggerDefinitions) {
      const triggerValidation = validateTriggers(parsedWorkflow, options.triggerDefinitions);
      for (const triggerError of triggerValidation.errors) {
        diagnostics.push({
          severity: 'error',
          message: triggerError.message,
          source: 'trigger',
        });
      }
    }
  }

  const liquidErrors = validateLiquidTemplate(yaml, parseResult.document);
  for (const liquidError of liquidErrors) {
    diagnostics.push({
      severity: 'error',
      message: liquidError.message,
      source: 'liquid',
    });
  }

  return {
    valid: diagnostics.filter((d) => d.severity === 'error').length === 0,
    diagnostics,
    parsedWorkflow,
  };
}
