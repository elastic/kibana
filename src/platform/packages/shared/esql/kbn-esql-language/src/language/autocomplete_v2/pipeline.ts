/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CursorIR, WrittenCommand } from '../../esql_js_sim/grammar';
import { getRegisteredCommand } from './command_metadata';

const isSame = (first: string[], second: string[]): boolean =>
  first.length === second.length && first.every((rule, index) => rule === second[index]);

/**
 * The commands the cursor is nested in, outermost first. Where a command starts, the command
 * around the cursor is one of them: the cursor is in its branch or subquery, not in it.
 */
export const getNesting = (ir: CursorIR): string[] =>
  ir.position === 'start_of_command' && ir.command
    ? [...ir.enclosingCommands, ir.command]
    : ir.enclosingCommands;

/** Where the innermost bracket that is still open in a command starts its content. */
const openBracketContentStart = ({ arguments: written }: WrittenCommand): number | undefined => {
  const open: number[] = [];

  for (const { kind, class: tokenClass, end } of written) {
    if (kind === 'token' && tokenClass === 'opener') {
      open.push(end);
    } else if (kind === 'token' && tokenClass === 'closer') {
      open.pop();
    }
  }

  return open.at(-1);
};

const isSource = ({ rule }: WrittenCommand): boolean =>
  getRegisteredCommand(rule)?.metadata.type === 'source';

/**
 * The query whose result the command at the cursor reads: the commands before it in its
 * pipeline. A branch continues the pipeline it is in, so the commands before the branching
 * command come first. A subquery starts with its own source and reads nothing from outside.
 */
export const getQueryBeforeCursor = (text: string, ir: CursorIR): string => {
  const nesting = getNesting(ir);
  const currentStart = ir.position === 'start_of_command' ? ir.segment.end : ir.segment.start;
  let query = '';
  let levelStart = 0;

  for (let level = 0; level <= nesting.length; level++) {
    const around = nesting.slice(0, level);
    // The command of the next level that the cursor is in, which ends this level.
    const enclosing =
      level < nesting.length
        ? ir.commands.findLast(
            ({ rule, enclosingCommands, start }) =>
              rule === nesting[level] && isSame(enclosingCommands, around) && start < currentStart
          )
        : undefined;
    const stop = enclosing?.start ?? currentStart;
    const [first] = ir.commands.filter(
      ({ enclosingCommands, start }) =>
        isSame(enclosingCommands, around) && start >= levelStart && start < stop
    );
    const written = text.slice(levelStart, stop).trim().replace(/\|$/, '').trim();

    if (first && isSource(first) && level > 0) {
      query = written;
    } else if (written) {
      query = query ? `${query} | ${written}` : written;
    }

    levelStart = (enclosing && openBracketContentStart(enclosing)) ?? stop;
  }

  return query;
};
