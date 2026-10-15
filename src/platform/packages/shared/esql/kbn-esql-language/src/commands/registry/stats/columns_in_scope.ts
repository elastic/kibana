/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstItem, ESQLAstQueryExpression, ESQLCommand } from '@elastic/esql/types';
import { Builder, Parser, isAssignment, isColumn } from '@elastic/esql';
import type { ColumnsInScopeParams } from '../registry';
import {
  findAstPosition,
  getBracketsToClose,
  removeAutocompleteMarkers,
} from '../../definitions/utils/ast';
import { EDITOR_MARKER } from '../../definitions/constants';
import { isByOption, isStatsCommand } from './utils';

const statsWithByAtCursor = (
  root: ESQLAstQueryExpression,
  cursorOffset: number
): ESQLCommand | undefined => {
  const { command } = findAstPosition(root, cursorOffset);
  return command?.type === 'command' && isStatsCommand(command) && command.args.some(isByOption)
    ? command
    : undefined;
};

/**
 * The query is parsed only up to the cursor, so a BY clause typed after the cursor is missing from
 * the command. Recover the stats command together with its BY clause: the full query usually parses
 * with the BY clause intact, but an incomplete expression at the cursor (e.g. an empty WHERE or an
 * unclosed function call) can swallow it. In that case, complete the expression with an editor
 * marker and close the brackets left open at the cursor so the BY clause parses as its own option.
 */
const statsCommandAtCursor = (fullText: string, cursorOffset: number): ESQLCommand | undefined => {
  const fromFullQuery = statsWithByAtCursor(Parser.parse(fullText).root, cursorOffset);
  if (fromFullQuery) {
    return fromFullQuery;
  }

  const beforeCursor = `${fullText.slice(0, cursorOffset)} ${EDITOR_MARKER} `;
  const corrected = `${beforeCursor}${getBracketsToClose(beforeCursor).join('')}${fullText.slice(
    cursorOffset
  )}`;
  const root = removeAutocompleteMarkers(Parser.parse(corrected).root);
  return statsWithByAtCursor(root, cursorOffset);
};

/**
 * Turns a grouping into the EVAL argument that introduces the column it defines, so the field
 * computation exposes it. Mirrors the naming rules Elasticsearch applies to STATS groupings.
 */
const groupingToEvalArg = (grouping: ESQLAstItem, fullText: string): ESQLAstItem[] => {
  // `name = expression` already names the column it defines.
  if (isAssignment(grouping)) {
    return [grouping];
  }

  // A bare column references an input field already in scope; it defines nothing new.
  if (isColumn(grouping)) {
    return [];
  }

  // A bare expression (e.g. `BUCKET(...)`) defines a column named by its source text. Name it
  // explicitly so the field computation doesn't depend on the grouping's post-cursor offsets.
  if (!Array.isArray(grouping)) {
    const name = fullText.substring(grouping.location.min, grouping.location.max + 1);
    return [Builder.expression.func.binary('=', [Builder.expression.column(name), grouping])];
  }

  return [];
};

/**
 * Columns defined in the BY clause are in scope for the aggregation expressions and the
 * per-aggregation WHERE clause. Expose them by rewriting the stats command into an EVAL of its
 * groupings, so they are both resolvable and suggested there — but not within the BY clause itself.
 */
export const columnsInScope = ({
  root,
  fullText,
  cursorOffset,
}: ColumnsInScopeParams): ESQLAstQueryExpression | undefined => {
  if (cursorOffset === undefined) {
    return undefined;
  }

  const command = statsCommandAtCursor(fullText, cursorOffset);
  const byOption = command?.args.find(isByOption);
  if (!byOption) {
    return undefined;
  }

  // Within the BY clause itself the grouping columns are not yet in scope.
  if (cursorOffset > byOption.location.min) {
    return undefined;
  }

  const groupingAssignments = byOption.args.flatMap((grouping) =>
    groupingToEvalArg(grouping, fullText)
  );
  if (groupingAssignments.length === 0) {
    return undefined;
  }

  const commandsBeforeStats = root.commands.slice(0, -1);
  const groupingEval = Builder.command({ name: 'eval', args: groupingAssignments });
  return { ...root, commands: [...commandsBeforeStats, groupingEval] };
};
