/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLAstRerankCommand,
  ESQLMap,
  ESQLSingleAstItem,
  ESQLAstAllCommands,
} from '../../../types';
import { isAssignment, isFunctionExpression } from '../../../ast/is';
import { within } from '../../../ast/location';
import {
  extractValidExpressionRoot,
  getBinaryExpressionOperand,
} from '../../../definitions/utils/expressions';

export interface RerankPosition {
  position: CaretPosition;
  context?: {
    expressionRoot?: ESQLSingleAstItem;
    insideFunction?: boolean;
  };
}

export enum CaretPosition {
  RERANK_KEYWORD, // After RERANK: can be target field assignment or query
  RERANK_AFTER_TARGET_FIELD, // After potential target field: suggest assignment operator
  RERANK_AFTER_TARGET_ASSIGNMENT, // After "target_field ="
  ON_KEYWORD, // Should suggest "ON"
  ON_WITHIN_FIELD_LIST, // After "ON": suggest field names
  ON_KEEP_SUGGESTIONS_AFTER_TRAILING_SPACE, // Special case: After a complete field with space, suggest next actions or assignment
  ON_EXPRESSION, // After "ON": handle all field list expressions like EVAL
  WITHIN_MAP_EXPRESSION, // After "WITH": suggest a json of params
  AFTER_COMMAND, // Command is complete, suggest pipe
}

/**
 * Determines caret position in RERANK command
 */
export function getPosition(
  query: string,
  command: ESQLAstAllCommands,
  cursorPosition: number
): RerankPosition {
  const rerankCommand = command as ESQLAstRerankCommand;
  const innerText = query.substring(rerankCommand.location.min);
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
      const rhsExpression = Array.isArray(rhs) ? rhs[0] : rhs;
      const insideFunction =
        rhsExpression &&
        isFunctionExpression(rhsExpression) &&
        within(cursorPosition, rhsExpression);

      return {
        position: CaretPosition.ON_EXPRESSION,
        context: {
          expressionRoot: extractValidExpressionRoot(rhs),
          insideFunction,
        },
      };
    }

    if (!lastField.incomplete && isAfterCompleteFieldWithSpace(innerText)) {
      return { position: CaretPosition.ON_KEEP_SUGGESTIONS_AFTER_TRAILING_SPACE };
    }

    return { position: CaretPosition.ON_WITHIN_FIELD_LIST };
  }

  if (!!(rerankCommand.query && !rerankCommand.query.incomplete)) {
    return { position: CaretPosition.ON_KEYWORD };
  }

  // Check targetField (only if query is not complete)
  if (rerankCommand.targetField && !rerankCommand.targetField.incomplete) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_ASSIGNMENT };
  }

  if (isAfterPotentialTargetFieldWithSpace(innerText)) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_FIELD };
  }

  return { position: CaretPosition.RERANK_KEYWORD };
}

export function isAfterPotentialTargetFieldWithSpace(innerText: string): boolean {
  // Pattern: must have at least one non-quote word followed by space
  // !commandText.includes('"') is covered by 'withinQuotes' function in autocomplete.ts
  // However, we keep this extra safety check if it will be accidentally removed
  return innerText.endsWith(' ') && !innerText.includes('"') && /rerank\s+\w+\s+$/i.test(innerText);
}

function isAfterCompleteFieldWithSpace(innerText: string): boolean {
  // Matches "ON" followed by any content ending with non-comma/non-space character + space
  const completeWithSpace = /\bon\s+.*[^,\s]\s+$/i;
  const endsWithCommaSpace = /,\s+$/i;

  return completeWithSpace.test(innerText) && !endsWithCommaSpace.test(innerText);
}
