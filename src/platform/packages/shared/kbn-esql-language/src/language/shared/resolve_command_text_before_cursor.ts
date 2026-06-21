/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSubQuery, Walker } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstQueryExpression } from '@elastic/esql/types';
import { Commands } from '../../commands/definitions/keywords';
import { getTokenCommandStart, type EsqlLexerToken } from './lexer_scope';

const COMMANDS_WITH_NON_STANDARD_TOKEN_SCOPE: ReadonlySet<string> = new Set([Commands.ENRICH]);

export interface CommandSegment {
  start: number; // Absolute offset where this command segment starts in the full query.
  end: number; // Absolute offset where this command segment ends, currently the cursor.
  text: string; // fullText.slice(start, end), current command text up to the cursor.
}

/** Returns command-local cursor text without relying on repaired command end locations. */
export function resolveCommandTextBeforeCursor(
  fullText: string,
  offset: number,
  root: ESQLAstQueryExpression,
  tokens: EsqlLexerToken[]
): CommandSegment {
  const closestCommand = getClosestCommandBeforeCursor(root, offset);
  const tokenCommandStart = getTokenCommandStart(
    fullText,
    offset,
    tokens,
    getQueryParenStarts(root)
  );
  const commandStart =
    closestCommand && hasNonStandardTokenScope(closestCommand)
      ? closestCommand.location.min
      : tokenCommandStart;

  return {
    start: commandStart,
    end: offset,
    text: fullText.slice(commandStart, offset),
  };
}

/** Identifies commands whose lexer mode can expose delimiters that should stay command-local. */
function hasNonStandardTokenScope(command: ESQLAstAllCommands): boolean {
  return COMMANDS_WITH_NON_STANDARD_TOKEN_SCOPE.has(command.name);
}

/** Finds parenthesized query scopes whose inner pipes delimit commands rather than expressions. */
function getQueryParenStarts(root: ESQLAstQueryExpression): Set<number> {
  const starts = new Set<number>();

  Walker.walk(root, {
    visitParens: (node) => {
      const isQueryParens = isSubQuery(node) && Boolean(node.child?.commands?.length);

      if (isQueryParens) {
        starts.add(node.location.min);
      }
    },
  });

  return starts;
}

/** Returns the last parsed command that starts before the cursor using only stable start offsets. */
function getClosestCommandBeforeCursor(
  root: ESQLAstQueryExpression,
  offset: number
): ESQLAstAllCommands | undefined {
  // We do not use findCommand/findCommandSubType here: they depend on location.max,
  // which may include syntax-repair text appended after the cursor.
  return Walker.commands(root)
    .filter((command) => command.location.min <= offset)
    .sort((a, b) => b.location.min - a.location.min)[0];
}
