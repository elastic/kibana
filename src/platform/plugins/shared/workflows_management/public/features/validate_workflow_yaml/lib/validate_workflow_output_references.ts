/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { i18n } from '@kbn/i18n';
import { isDynamicValue } from '@kbn/workflows-yaml';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { createStepOutputPattern } from '../../../../common/lib/step_output_pattern';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import {
  getValueFromValueNode,
  type StepInfo,
  type WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

const getUnknownOutputMessage = (
  workflowName: string,
  field: string,
  outputNames: readonly string[]
): string =>
  outputNames.length > 0
    ? i18n.translate('workflows.validateWorkflowInputs.unknownOutputReference', {
        defaultMessage:
          'Workflow "{workflowName}" doesn’t return an output named "{field}". It returns: {availableOutputs}',
        values: { workflowName, field, availableOutputs: outputNames.join(', ') },
      })
    : i18n.translate('workflows.validateWorkflowInputs.unknownOutputReferenceNoOutputs', {
        defaultMessage:
          'Workflow "{workflowName}" doesn’t return an output named "{field}". It returns no outputs',
        values: { workflowName, field },
      });

function validateStepOutputReferences(
  step: StepInfo,
  workflows: WorkflowsResponse,
  yamlString: string,
  lineCounter: LineCounter
): YamlValidationResult[] {
  if (step.stepType !== 'workflow.execute') return [];

  const workflowIdProp = step.propInfos['with.workflow-id'];
  const workflowId = workflowIdProp ? getValueFromValueNode(workflowIdProp.valueNode) : undefined;
  if (typeof workflowId !== 'string' || !workflowId || isDynamicValue(workflowId)) return [];

  const childWorkflow = workflows.workflows[workflowId];
  const outputNames = childWorkflow?.outputNames;
  if (!childWorkflow || !outputNames) return [];

  const available = new Set(outputNames);
  const results: YamlValidationResult[] = [];
  for (const match of yamlString.matchAll(createStepOutputPattern(step.stepId))) {
    const field = match[1] ?? match[2];
    if (field && !available.has(field) && match.index !== undefined) {
      const fieldOffset = match.index + match[0].lastIndexOf(field);
      const startPos = lineCounter.linePos(fieldOffset);
      const endPos = lineCounter.linePos(fieldOffset + field.length);
      results.push({
        id: `workflow-output-reference-${step.stepId}-${field}-${fieldOffset}`,
        severity: 'error',
        message: getUnknownOutputMessage(childWorkflow.name, field, outputNames),
        owner: 'workflow-inputs-validation',
        ruleId: 'unknownOutputReference',
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
        hoverMessage: null,
      });
    }
  }
  return results;
}

/**
 * Flags `steps.<step>.output.<field>` references to a `workflow.execute` step when the child
 * workflow declares its outputs and `<field>` is not one of them.
 */
export function validateWorkflowOutputReferences(
  workflowLookup: WorkflowLookup,
  workflows: WorkflowsResponse | null,
  yamlString: string,
  lineCounter: LineCounter
): YamlValidationResult[] {
  if (!workflows) return [];
  return Object.values(workflowLookup.steps).flatMap((step) =>
    validateStepOutputReferences(step, workflows, yamlString, lineCounter)
  );
}
