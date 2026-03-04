/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { collectIfConditionItems, type IfConditionItem } from './collect_if_condition_items';
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
  return condition.includes('{{');
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
 * Strip quoted string contents so operators inside values (e.g. `field: "a==b"`)
 * don't trigger false positives during regex-based operator detection.
 */
function stripQuotedContents(condition: string): string {
  return condition.replace(/"[^"]*"|'[^']*'/g, '""');
}

/**
 * Detects common invalid operators that KQL doesn't support but users commonly try.
 * KQL treats these as free-text searches rather than throwing errors, so we must
 * detect them explicitly.
 */
function detectInvalidOperator(condition: string): OperatorDetectionResult | null {
  const unquoted = stripQuotedContents(condition);

  if (/\S+\s*==\s*\S+/.test(unquoted)) {
    const message = i18n.translate('workflows.validateIfConditions.invalidEqualityOperator', {
      defaultMessage:
        'Invalid condition syntax: "==" is not a valid KQL operator. Use ":" for equality (e.g., "field: value").',
    });
    return { message, hoverMessage: message + KQL_EXAMPLES_HOVER };
  }

  if (/\S+\s*!=\s*\S+/.test(unquoted)) {
    const message = i18n.translate('workflows.validateIfConditions.invalidInequalityOperator', {
      defaultMessage:
        'Invalid condition syntax: "!=" is not a valid KQL operator. Use "NOT field: value" for inequality.',
    });
    return { message, hoverMessage: message + KQL_EXAMPLES_HOVER };
  }

  if (/\S+\s*(?<![<>!:])=(?!=)\s*\S+/.test(unquoted) && !unquoted.includes(':')) {
    const message = i18n.translate('workflows.validateIfConditions.invalidAssignmentOperator', {
      defaultMessage:
        'Invalid condition syntax: "=" is not a valid KQL operator. Use ":" for equality (e.g., "field: value").',
    });
    return { message, hoverMessage: message + KQL_EXAMPLES_HOVER };
  }

  return null;
}

function makeResult(
  item: IfConditionItem,
  message: string,
  hoverMessage: string
): YamlValidationResult {
  return {
    id: `if-condition-${item.startLineNumber}-${item.startColumn}`,
    owner: CONDITION_VALIDATION_OWNER,
    message,
    startLineNumber: item.startLineNumber,
    startColumn: item.startColumn,
    endLineNumber: item.endLineNumber,
    endColumn: item.endColumn,
    severity: 'error',
    hoverMessage,
  };
}

function validateCondition(item: IfConditionItem): YamlValidationResult | null {
  if (isExpressionSyntax(item.condition)) {
    return null;
  }

  if (containsTemplate(item.condition)) {
    return null;
  }

  const trimmed = item.condition.trim();

  const operatorError = detectInvalidOperator(trimmed);
  if (operatorError) {
    return makeResult(item, operatorError.message, operatorError.hoverMessage);
  }

  try {
    fromKueryExpression(trimmed);
    return null;
  } catch (error) {
    const errorMessage = (error as Error).message;
    return makeResult(item, errorMessage, errorMessage + KQL_EXAMPLES_HOVER);
  }
}

/**
 * Validates KQL syntax for if-step conditions and step-level `if` conditions.
 * Returns editor-ready results with line/column positions for Monaco markers.
 */
export function validateIfConditions(yamlDocument: Document): YamlValidationResult[] {
  const items = collectIfConditionItems(yamlDocument);
  const results: YamlValidationResult[] = [];

  for (const item of items) {
    const result = validateCondition(item);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
