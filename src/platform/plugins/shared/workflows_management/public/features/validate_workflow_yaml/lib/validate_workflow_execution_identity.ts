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
import { getValueFromValueNode } from '@kbn/workflows-yaml';
import type {
  StepInfo,
  StepPropInfo,
  WorkflowLookup,
  YamlValidationResult,
} from '@kbn/workflows-yaml';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';

const validateStepIdentity = (
  step: StepInfo,
  workflows: WorkflowsResponse | null
): { property: StepPropInfo; message: string } | undefined => {
  const modeProperty = step.propInfos['with.runAsMode'];
  const mode = modeProperty && getValueFromValueNode(modeProperty.valueNode);
  if (mode !== 'inherit' && mode !== 'override') return;
  const workflowIdProperty = step.propInfos['with.workflow-id'];
  if (!workflowIdProperty) return;
  const workflowId = getValueFromValueNode(workflowIdProperty.valueNode);
  if (typeof workflowId !== 'string') return;
  if (workflowId.includes('{{') || workflowId.includes('{%')) {
    return {
      property: workflowIdProperty,
      message: i18n.translate('workflows.validateExecutionIdentity.literalChildErrorMessage', {
        defaultMessage:
          'Service account inheritance requires a literal workflow-id. Expressions are not supported.',
      }),
    };
  }
  const child = workflows?.workflows[workflowId];
  if (child && child.managed !== true) {
    return {
      property: workflowIdProperty,
      message: i18n.translate('workflows.validateExecutionIdentity.managedChildErrorMessage', {
        defaultMessage: 'Only managed child workflows can inherit a parent service account.',
      }),
    };
  }
};

/** Validates child identity choices before the execution engine admits the child. */
export const validateWorkflowExecutionIdentity = (
  lookup: WorkflowLookup,
  workflows: WorkflowsResponse | null,
  lineCounter: LineCounter
): YamlValidationResult[] =>
  Object.values(lookup.steps).flatMap((step) => {
    if (step.stepType !== 'workflow.execute' && step.stepType !== 'workflow.executeAsync')
      return [];
    const issue = validateStepIdentity(step, workflows);
    const range = issue?.property.valueNode?.range ?? issue?.property.keyNode?.range;
    if (!issue || !range) return [];
    const start = lineCounter.linePos(range[0]);
    const end = lineCounter.linePos(range[1]);
    return [
      {
        id: `workflow-execution-identity-${step.stepId}`,
        owner: 'step-property-validation',
        ruleId: 'invalidStepProperty',
        severity: 'error',
        message: issue.message,
        startLineNumber: start.line,
        startColumn: start.col,
        endLineNumber: end.line,
        endColumn: end.col,
        hoverMessage: null,
      },
    ];
  });
