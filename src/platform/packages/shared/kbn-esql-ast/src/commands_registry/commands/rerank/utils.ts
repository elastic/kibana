/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstRerankCommand, ESQLMap, ESQLSingleAstItem } from '../../../types';
import { isAssignment, isColumn } from '../../../ast/is';
import {
  extractValidExpressionRoot,
  getBinaryExpressionOperand,
} from '../../../definitions/utils/expressions';
import { getExpressionPosition } from '../../../definitions/utils/autocomplete/helpers';
import { isMarkerNode } from '../../../definitions/utils/ast';

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
  ON_KEEP_OPERATOR_AFTER_TRAILING_SPACE, // Special case: After a complete field with space, suggest next actions or assignment
  ON_EXPRESSION, // After "ON": handle all field list expressions like EVAL
  WITHIN_MAP_EXPRESSION, // After "WITH": suggest a json of params
  AFTER_COMMAND, // Command is complete, suggest pipe
}

/**
 * Determines caret position in RERANK command
 */
export function getPosition(innerText: string, command: ESQLCommand): RerankPosition {
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
        position: CaretPosition.ON_EXPRESSION,
        context: { expressionRoot: extractValidExpressionRoot(rhs) },
      };
    }

    // If the last ON item is a column and the caret is after a completed column + space,
    if (lastField && isColumn(lastField)) {
      const pos = getExpressionPosition(innerText, lastField);
      const hasCommaMarker = rerankCommand.fields.some((field) => isMarkerNode(field));

      if (pos === 'after_column' && !hasCommaMarker) {
        return { position: CaretPosition.ON_KEEP_OPERATOR_AFTER_TRAILING_SPACE };
      }
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

  if (isAfterPotentialTargetField(innerText, rerankCommand)) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_FIELD };
  }

  return { position: CaretPosition.RERANK_KEYWORD };
}

export function isAfterPotentialTargetField(
  innerText: string,
  rerankCommand: ESQLAstRerankCommand
): boolean {
  const commandText = innerText.substring(rerankCommand.location.min);
  // Pattern: must have at least one non-quote word followed by space
  return (
    commandText.endsWith(' ') && !commandText.includes('"') && /rerank\s+\w+\s+$/i.test(commandText)
  );
}
