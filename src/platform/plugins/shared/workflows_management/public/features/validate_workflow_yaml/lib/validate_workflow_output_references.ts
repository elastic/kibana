/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { LIQUID_DYNAMIC_KEY_SEGMENT, parsePath } from '@kbn/workflows/common/utils/zod';
import { isDynamicValue, parseVariablePath } from '@kbn/workflows-yaml';
import type { VariableItem, YamlValidationResult } from '@kbn/workflows-yaml';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import {
  getValueFromValueNode,
  type StepInfo,
  type WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

// Liquid resolves `size` on any object to its number of keys.
const LIQUID_OBJECT_PROPERTIES = new Set(['size']);

interface OutputReference {
  stepName: string;
  field: string;
}

interface CalledWorkflowOutputs {
  workflowName: string;
  names: ReadonlySet<string>;
}

const getUnknownOutputMessage = (
  workflowName: string,
  field: string,
  outputNames: readonly string[]
): string =>
  outputNames.length > 0
    ? i18n.translate('workflows.validateWorkflowOutputReferences.unknown', {
        defaultMessage:
          'Workflow "{workflowName}" doesn’t return an output named "{field}". It returns: {availableOutputs}',
        values: { workflowName, field, availableOutputs: outputNames.join(', ') },
      })
    : i18n.translate('workflows.validateWorkflowOutputReferences.none', {
        defaultMessage:
          'Workflow "{workflowName}" doesn’t return an output named "{field}". It returns no outputs',
        values: { workflowName, field },
      });

const getOutputReference = (variableKey: string): OutputReference | undefined => {
  const propertyPath = parseVariablePath(variableKey)?.propertyPath;
  const segments = propertyPath ? parsePath(propertyPath) : null;
  if (!segments || segments.length < 4 || segments[0] !== 'steps' || segments[2] !== 'output') {
    return undefined;
  }
  const [, stepName, , field] = segments;
  if (stepName === LIQUID_DYNAMIC_KEY_SEGMENT || field === LIQUID_DYNAMIC_KEY_SEGMENT) {
    return undefined;
  }
  return { stepName, field };
};

/** The outputs a `workflow.execute` step can get, or undefined when any field may come back. */
const getCalledWorkflowOutputs = (
  step: StepInfo,
  workflows: WorkflowsResponse
): CalledWorkflowOutputs | undefined => {
  if (step.stepType !== 'workflow.execute') return undefined;

  const workflowIdProp = step.propInfos['with.workflow-id'];
  const workflowId = workflowIdProp ? getValueFromValueNode(workflowIdProp.valueNode) : undefined;
  if (typeof workflowId !== 'string' || !workflowId || isDynamicValue(workflowId)) {
    return undefined;
  }

  const childWorkflow = workflows.workflows[workflowId];
  if (!childWorkflow?.outputNames || !childWorkflow.returnedOutputNames) return undefined;

  // The run passes on undeclared values a `workflow.output` step sets, so those are available too.
  return {
    workflowName: childWorkflow.name,
    names: new Set([...childWorkflow.outputNames, ...childWorkflow.returnedOutputNames]),
  };
};

/**
 * Flags `steps.<step>.output.<field>` variables that reference a `workflow.execute` step when the
 * called workflow declares its outputs and neither declares nor returns `<field>`.
 */
export function validateWorkflowOutputReferences(
  workflowLookup: WorkflowLookup,
  workflows: WorkflowsResponse | null,
  variableItems: readonly VariableItem[]
): YamlValidationResult[] {
  if (!workflows) return [];

  const outputsByStep = new Map<string, CalledWorkflowOutputs | undefined>();
  const getOutputs = (step: StepInfo): CalledWorkflowOutputs | undefined => {
    if (!outputsByStep.has(step.stepId)) {
      outputsByStep.set(step.stepId, getCalledWorkflowOutputs(step, workflows));
    }
    return outputsByStep.get(step.stepId);
  };

  return variableItems.flatMap((variableItem): YamlValidationResult[] => {
    const reference = getOutputReference(variableItem.key);
    const step = reference ? workflowLookup.steps[reference.stepName] : undefined;
    const outputs = step ? getOutputs(step) : undefined;
    if (
      !reference ||
      !outputs ||
      outputs.names.has(reference.field) ||
      LIQUID_OBJECT_PROPERTIES.has(reference.field)
    ) {
      return [];
    }

    const { id, startLineNumber, startColumn, endLineNumber, endColumn } = variableItem;
    return [
      {
        id: `workflow-output-reference-${id}`,
        severity: 'error',
        message: getUnknownOutputMessage(outputs.workflowName, reference.field, [...outputs.names]),
        owner: 'workflow-inputs-validation',
        ruleId: 'unknownOutputReference',
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
        hoverMessage: null,
      },
    ];
  });
}
