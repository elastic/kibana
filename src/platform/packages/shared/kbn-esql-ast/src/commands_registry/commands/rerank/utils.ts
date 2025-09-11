/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstRerankCommand, ESQLMap, ESQLSingleAstItem } from '../../../types';
import type { ICommandContext } from '../../types';
import { isAssignment, isColumn, isParamLiteral } from '../../../ast/is';
import {
  extractValidExpressionRoot,
  getBinaryExpressionOperand,
} from '../../../definitions/utils/expressions';

export type RhsBooleanState = 'after-assignment' | 'within' | 'complete' | 'none';

export interface RerankPosition {
  position: CaretPosition;
  context?: {
    expressionRoot?: ESQLSingleAstItem;
  };
}

export enum CaretPosition {
  RERANK_KEYWORD, // After RERANK: can be target field assignment or query
  RERANK_AFTER_TARGET_FIELD, // After potential target field: suggest assignment operator
  RERANK_AFTER_TARGET_ASSIGNMENT, // After "target_field ="
  ON_KEYWORD, // Should suggest "ON"
  ON_WITHIN_FIELD_LIST, // After "ON": suggest field names
  ON_AFTER_POTENTIAL_CUSTOM_FIELD, // After potential custom field in ON clause: suggest assignment operator
  ON_AFTER_FIELD_COMPLETE, // After complete field: suggest continuations (comma, WITH, pipe, assignment)
  WITHIN_BOOLEAN_EXPRESSION, // Inside booleanExpression: suggest operators (>, <, ==, etc.)
  WITHIN_MAP_EXPRESSION, // After "WITH": suggest a json of params
  AFTER_COMMAND, // Command is complete, suggest pipe
}

/**
 * Determines caret position in RERANK command
 */
export function getPosition(
  innerText: string,
  command: ESQLCommand,
  context: ICommandContext | undefined,
  cursorPosition: number | undefined
): RerankPosition {
  const rerankCommand = command as ESQLAstRerankCommand;
  const onMap = rerankCommand.args[1];
  const withMap = rerankCommand.args[2] as ESQLMap | undefined;

  if (withMap) {
    if (withMap.text && withMap.incomplete) {
      return { position: CaretPosition.WITHIN_MAP_EXPRESSION };
    }

    if (!withMap.incomplete) {
      return { position: CaretPosition.AFTER_COMMAND };
    }
  }

  if (onMap) {
    const lastField = rerankCommand.fields?.[rerankCommand.fields.length - 1];

    if (lastField && isAssignment(lastField)) {
      const rhs = getBinaryExpressionOperand(lastField, 'right');

      return {
        position: CaretPosition.WITHIN_BOOLEAN_EXPRESSION,
        context: { expressionRoot: extractValidExpressionRoot(rhs) },
      };
    }

    if (!lastField || lastField.incomplete) {
      return { position: CaretPosition.ON_WITHIN_FIELD_LIST };
    }

    const fieldPosition = analyzeCompleteFieldContext(
      lastField,
      cursorPosition,
      innerText,
      context
    );

    return { position: fieldPosition };
  }

  if (!!(rerankCommand.query && !rerankCommand.query.incomplete)) {
    return { position: CaretPosition.ON_KEYWORD };
  }

  // Check targetField (only if query is not complete)
  if (rerankCommand.targetField && !rerankCommand.targetField.incomplete) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_ASSIGNMENT };
  }

  // Check for pattern "RERANK col0 " (space after potential target field)
  const isPotentialTargetField = isAfterPotentialTargetField(innerText, command);

  if (isPotentialTargetField) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_FIELD };
  }

  return { position: CaretPosition.RERANK_KEYWORD };
}

// Analyze context of the last field relative to the cursor
function analyzeFieldContext(
  lastField: ESQLSingleAstItem,
  cursorPosition: number,
  innerText: string
):
  | { position: 'within_field'; field: ESQLSingleAstItem; hasSpace: false }
  | { position: 'after_field'; field: ESQLSingleAstItem; hasSpace: boolean; isComplete: boolean } {
  // Cursor strictly after the last field end (location.max is inclusive)
  if (cursorPosition > lastField.location.max) {
    const textAfterField = innerText.slice(lastField.location.max + 1, cursorPosition);
    const hasSpace = /\s/.test(textAfterField);
    return {
      position: 'after_field',
      field: lastField,
      hasSpace,
      isComplete: !lastField.incomplete,
    };
  }

  return { position: 'within_field', field: lastField, hasSpace: false };
}

function isAfterPotentialTargetField(innerText: string, command: ESQLCommand): boolean {
  const commandText = innerText.substring(command.location.min);
  // Check for pattern "RERANK col0 " (field followed by space, cursor at end)
  const match = /^rerank\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+$/i.exec(commandText);

  if (match) {
    const potentialField = match[1];

    return !potentialField.startsWith('"');
  }

  return false;
}

function analyzeCompleteFieldContext(
  lastField: ESQLSingleAstItem,
  cursorPosition: number | undefined,
  innerText: string,
  context: ICommandContext | undefined
): CaretPosition {
  if (!(isColumn(lastField) || isParamLiteral(lastField))) {
    return CaretPosition.ON_WITHIN_FIELD_LIST;
  }

  const pos = cursorPosition ?? innerText.length;
  const { position, field, hasSpace } = analyzeFieldContext(lastField, pos, innerText);

  if (position === 'after_field') {
    const fieldName = field.name;
    const isCustomField = !!(fieldName && context?.fields && !context.fields.has(fieldName));
    const isCursorAtEndOfField = pos === field.location.max + 1;

    if (isCustomField && (hasSpace || isCursorAtEndOfField)) {
      return CaretPosition.ON_AFTER_POTENTIAL_CUSTOM_FIELD;
    }

    if (hasSpace) {
      return CaretPosition.ON_AFTER_FIELD_COMPLETE;
    }
  }

  return CaretPosition.ON_WITHIN_FIELD_LIST;
}
