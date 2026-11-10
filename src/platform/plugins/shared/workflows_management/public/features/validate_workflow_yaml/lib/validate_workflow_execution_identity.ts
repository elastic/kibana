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
import type { WorkflowLookup, YamlValidationResult } from '@kbn/workflows-yaml';

/** Rejects inheritance in editable, unmanaged workflow definitions. */
export const validateWorkflowExecutionIdentity = (
  lookup: WorkflowLookup,
  lineCounter: LineCounter,
  isManaged: boolean
): YamlValidationResult[] => {
  if (isManaged) return [];
  return Object.values(lookup.steps).flatMap((step) => {
    if (step.stepType !== 'workflow.execute' && step.stepType !== 'workflow.executeAsync')
      return [];
    const property = step.propInfos['with.run-as-mode'];
    const mode = property && getValueFromValueNode(property.valueNode);
    if (mode !== 'inherit' && mode !== 'override') return [];
    const range = property.valueNode?.range ?? property.keyNode?.range;
    if (!range) return [];
    const start = lineCounter.linePos(range[0]);
    const end = lineCounter.linePos(range[1]);
    return [
      {
        id: `workflow-execution-identity-${step.stepId}`,
        owner: 'step-property-validation',
        ruleId: 'invalidStepProperty',
        severity: 'error',
        message: i18n.translate('workflows.validateExecutionIdentity.managedParentErrorMessage', {
          defaultMessage: 'Service account inheritance is only available to managed workflows.',
        }),
        startLineNumber: start.line,
        startColumn: start.col,
        endLineNumber: end.line,
        endColumn: end.col,
        hoverMessage: null,
      },
    ];
  });
};
