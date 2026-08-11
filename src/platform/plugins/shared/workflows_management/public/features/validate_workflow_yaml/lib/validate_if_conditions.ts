/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  getValueFromValueNode,
  type StepPropInfo,
  type WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

const CONDITION_VALIDATION_OWNER = 'if-condition-validation' as const;

const KQL_EXAMPLES_HOVER = [
  '',
  '**KQL condition examples:**',
  '- Equality: `field: value`',
  '- String match: `field: "some text"`',
  '- Dynamic value: `field: "{{foreach.item}}"`',
  '- Numeric comparison: `field > 0` or `field < 100`',
  '- Negation: `NOT field: value`',
  '- Boolean expression: `${{ steps.myStep.output.count > 0 }}`',
].join('\n\n');

function containsTemplate(condition: string): boolean {
  return condition.includes('{{') || condition.includes('${{');
}

function isExpressionSyntax(condition: string): boolean {
  const trimmed = condition.trim();
  return trimmed.startsWith('${{') && trimmed.endsWith('}}');
}

interface OperatorDetectionResult {
  message: string;
  hoverMessage: string;
}

/**
 * Detects common invalid operators that KQL doesn't support but users commonly try.
 * KQL treats these as free-text searches rather than throwing errors, so we must
 * detect them explicitly.
 */
function detectInvalidOperator(condition: string): OperatorDetectionResult | null {
  if (/\S+\s*==\s*\S+/.test(condition)) {
    const message = i18n.translate('workflows.validateIfConditions.invalidEqualityOperator', {
      defaultMessage:
        'Invalid condition syntax: "==" is not a valid KQL operator. Use ":" for equality (e.g., "field: value").',
    });
    return { message, hoverMessage: message + KQL_EXAMPLES_HOVER };
  }

  if (/\S+\s*!=\s*\S+/.test(condition)) {
    const message = i18n.translate('workflows.validateIfConditions.invalidInequalityOperator', {
      defaultMessage:
        'Invalid condition syntax: "!=" is not a valid KQL operator. Use "NOT field: value" for inequality.',
    });
    return { message, hoverMessage: message + KQL_EXAMPLES_HOVER };
  }

  if (/\S+\s*(?<![<>!:])=(?!=)\s*\S+/.test(condition) && !condition.includes(':')) {
    const message = i18n.translate('workflows.validateIfConditions.invalidAssignmentOperator', {
      defaultMessage:
        'Invalid condition syntax: "=" is not a valid KQL operator. Use ":" for equality (e.g., "field: value").',
    });
    return { message, hoverMessage: message + KQL_EXAMPLES_HOVER };
  }

  return null;
}

function makeResult(
  stepId: string,
  propInfo: StepPropInfo,
  lineCounter: LineCounter,
  message: string,
  hoverMessage: string
): YamlValidationResult | null {
  const valueRange = propInfo.valueNode?.range;
  if (!valueRange) return null;
  const startPos = lineCounter.linePos(valueRange[0]);
  const endPos = lineCounter.linePos(valueRange[1]);
  return {
    id: `if-condition-${stepId}-${startPos.line}-${startPos.col}`,
    owner: CONDITION_VALIDATION_OWNER,
    message,
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
    severity: 'error',
    hoverMessage,
  };
}

function validateCondition(
  stepId: string,
  propInfo: StepPropInfo,
  lineCounter: LineCounter
): YamlValidationResult | null {
  const value = getValueFromValueNode(propInfo.valueNode);
  if (typeof value !== 'string' || !value.trim()) return null;

  if (isExpressionSyntax(value)) return null;
  if (containsTemplate(value)) return null;

  const trimmed = value.trim();

  const operatorError = detectInvalidOperator(trimmed);
  if (operatorError) {
    return makeResult(
      stepId,
      propInfo,
      lineCounter,
      operatorError.message,
      operatorError.hoverMessage
    );
  }

  try {
    fromKueryExpression(trimmed);
    return null;
  } catch (error) {
    const errorMessage = (error as Error).message;
    return makeResult(
      stepId,
      propInfo,
      lineCounter,
      errorMessage,
      errorMessage + KQL_EXAMPLES_HOVER
    );
  }
}

/**
 * Validates KQL syntax for if-step conditions and step-level `if` conditions.
 * Uses workflowLookup which already exposes propInfos['condition'] and propInfos['if']
 * on every step with the value node and range.
 */
export function validateIfConditions(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  for (const step of Object.values(workflowLookup.steps)) {
    const conditionProp = step.stepType === 'if' ? step.propInfos.condition : undefined;
    const ifProp = step.propInfos.if;

    for (const prop of [conditionProp, ifProp]) {
      if (prop) {
        const result = validateCondition(step.stepId, prop, lineCounter);
        if (result) results.push(result);
      }
    }
  }

  return results;
}
