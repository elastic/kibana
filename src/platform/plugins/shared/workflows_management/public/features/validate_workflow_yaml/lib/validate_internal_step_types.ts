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
import type { WorkflowLookup, YamlValidationResult } from '@kbn/workflows-yaml';
import { getStepUsageRestriction } from '../../../../common/schema';

const getInternalStepMessage = (stepType: string): string =>
  i18n.translate('workflows.validateInternalStepTypes.internalStepWarningMessage', {
    defaultMessage:
      'Step type "{stepType}" is an internal step. Use it at your own risk: its inputs, outputs and behavior can change without notice.',
    values: { stepType },
  });

const getManagedOnlyStepMessage = (stepType: string): string =>
  i18n.translate('workflows.validateInternalStepTypes.managedOnlyStepErrorMessage', {
    defaultMessage:
      'Step type "{stepType}" is an internal step and can\'t be used in custom workflows.',
    values: { stepType },
  });

/** Flags `internal` (warning) and `managedOnly` (error) steps in workflows that aren't managed. */
export const validateInternalStepTypes = (
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter,
  isManaged: boolean
): YamlValidationResult[] => {
  if (isManaged) {
    return [];
  }

  return Object.values(workflowLookup.steps).flatMap((step): YamlValidationResult[] => {
    const restriction = getStepUsageRestriction(step.stepType);
    const range = step.propInfos.type?.valueNode.range;
    if (!restriction || !range) {
      return [];
    }

    const [startOffset, endOffset] = range;
    const startPos = lineCounter.linePos(startOffset);
    const endPos = lineCounter.linePos(endOffset);
    const isManagedOnly = restriction === 'managedOnly';

    return [
      {
        id: `internal-step-type-${step.stepId}-${startPos.line}-${startPos.col}`,
        owner: 'internal-step-validation',
        ruleId: isManagedOnly ? 'managedOnlyStepType' : 'internalStepType',
        severity: isManagedOnly ? 'error' : 'warning',
        message: isManagedOnly
          ? getManagedOnlyStepMessage(step.stepType)
          : getInternalStepMessage(step.stepType),
        hoverMessage: null,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
      },
    ];
  });
};
