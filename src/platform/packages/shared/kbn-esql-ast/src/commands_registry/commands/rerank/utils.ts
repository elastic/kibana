/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstRerankCommand, ESQLMap, ESQLSingleAstItem } from '../../../types';
import { isAssignment, isFunctionExpression } from '../../../ast/is';

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
  SUGGEST_ON_KEYWORD, // Should suggest "ON"
  ON_AFTER_FIELD_LIST, // After "ON": suggest field names
  ON_AFTER_FIELD_ASSIGNMENT, // After "field =" in field list: suggest expressions/functions
  ON_AFTER_FIELD_COMPLETE, // After complete field: suggest continuations (comma, WITH, pipe, assignment)
  WITHIN_BOOLEAN_EXPRESSION, // Inside booleanExpression: suggest operators (>, <, ==, etc.)
  BOOLEAN_EXPRESSION_COMPLETE, // Complete booleanExpression: suggest continuations (AND, OR, comma, WITH, pipe)
  WITHIN_MAP_EXPRESSION, // After "WITH": suggest a json of params
  AFTER_COMMAND, // Command is complete, suggest pipe
}

/**
 * Determines caret position in RERANK command
 */
export function getPosition(innerText: string, command: ESQLCommand): RerankPosition {
  const rerankCommand = command as ESQLAstRerankCommand;

  const OnMap = rerankCommand.args[1];
  const WithMap = rerankCommand.args[2] as ESQLMap | undefined;

  if (WithMap) {
    if (WithMap.text && WithMap.incomplete) {
      return { position: CaretPosition.WITHIN_MAP_EXPRESSION };
    }

    if (!WithMap.incomplete) {
      return { position: CaretPosition.AFTER_COMMAND };
    }
  }

  if (OnMap) {
    // Check for incomplete field assignment first: "ON my_field = "
    if (hasIncompleteFieldAssignment(rerankCommand) || isAfterFieldAssignment(innerText)) {
      return { position: CaretPosition.ON_AFTER_FIELD_ASSIGNMENT };
    }

    // Follow EVAL pattern: treat RHS as within-expression; autocomplete decides completeness
    const lastField = rerankCommand.fields?.[rerankCommand.fields.length - 1];

    if (lastField && isAssignment(lastField)) {
      // WHERE pattern: extract RHS for boolean expression
      const expressionRoot = Array.isArray(lastField.args[1])
        ? (lastField.args[1][0] as ESQLSingleAstItem)
        : lastField.args[1];

      if (expressionRoot) {
        return {
          position: CaretPosition.WITHIN_BOOLEAN_EXPRESSION,
          // Extract the boolean expression's AST root
          // This context is crucial to offering 'AND/OR' after a complete expression or values after an operator
          context: { expressionRoot },
        };
      }
    }
    if (isAfterCompleteFieldWithSpace(innerText)) {
      return { position: CaretPosition.ON_AFTER_FIELD_COMPLETE };
    }

    return { position: CaretPosition.ON_AFTER_FIELD_LIST };
  }

  const queryComplete = !!(rerankCommand.query && !rerankCommand.query.incomplete);

  if (queryComplete) {
    return { position: CaretPosition.SUGGEST_ON_KEYWORD };
  }

  // Check targetField (only if query is not complete)
  if (rerankCommand.targetField && !rerankCommand.targetField.incomplete) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_ASSIGNMENT };
  }

  // Check for pattern "RERANK col0 " (space after potential target field)
  if (!rerankCommand.targetField && isAfterPotentialTargetField(innerText, command)) {
    return { position: CaretPosition.RERANK_AFTER_TARGET_FIELD };
  }

  return { position: CaretPosition.RERANK_KEYWORD };
}

function hasIncompleteFieldAssignment(command: ESQLAstRerankCommand): boolean {
  try {
    const lastField = command.fields?.[command.fields.length - 1];

    if (!lastField || !isFunctionExpression(lastField)) {
      return false;
    }

    if (!isAssignment(lastField) || !Array.isArray(lastField.args)) {
      return false;
    }

    const rhs = lastField.args[1];

    return (
      rhs === undefined ||
      (Array.isArray(rhs) && rhs.length === 0) ||
      (!Array.isArray(rhs) && !!rhs?.incomplete)
    );
  } catch {
    return false;
  }
}

// WWhen the RHS is mssing, the CTS does not include ASSING(=).
// The Ast cannot see "field =" inside the ON clause yet.
// Use a regex on raw text ti detect the incomplete assignment and drive suggestions.
function isAfterFieldAssignment(text: string): boolean {
  return /\bon\s+.*\w+\s*=\s*$/i.test(text);
}

// AST does not encode trailing whitespace/caret after fields: we rely on regex
// to detect "ON <field>[, <field>...] <space>" and switch to next actions
// (comma/WITH/pipe) instead of reopening field suggestions.
function isAfterCompleteFieldWithSpace(text: string): boolean {
  const hasFieldWithSpace = /\bon\s+(?:[^=\s,]+(?:\s*,\s*[^=\s,]+)*)\s+$/i.test(text);
  const hasAssignment = /\bon\s+.*=\s*$/i.test(text);
  const endsWithCommaSpace = /,\s+$/i.test(text);

  return hasFieldWithSpace && !hasAssignment && !endsWithCommaSpace;
}

// AST cannot disambiguate "RERANK <identifier>" without '=' or a string.
// and it does not capture trailing space; use regex on raw text to detect
// "RERANK <identifier> " and trigger the assignment operator suggestion (=)
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
