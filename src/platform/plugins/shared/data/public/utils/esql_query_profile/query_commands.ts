/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface QueryCommand {
  /** The command name in upper case, such as STATS. */
  name: string;
  /** The command as written, from its name to just before the next pipe, comments included. */
  text: string;
  /** Offset of the first character of the command in the query. */
  start: number;
  /** Offset just after the last character of the command in the query. */
  end: number;
  /**
   * The queries inside the parentheses of a FROM or FORK command, in the order they are written.
   * Each is a list of commands with offsets into the whole query. Only one level is looked at.
   */
  branches?: QueryCommand[][];
}

/** Whether two queries are the same apart from whitespace. */
export const isSameQuery = (left: string, right: string): boolean =>
  left.replace(/\s+/g, ' ').trim() === right.replace(/\s+/g, ' ').trim();

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

/**
 * Walks the characters of a range of a query that are not inside strings or comments, with the
 * bracket depth each one is at, before the character itself is counted.
 */
function scanCode(
  query: string,
  from: number,
  to: number,
  visit: (index: number, char: string, depth: number) => void
) {
  let depth = 0;
  let quote: string | undefined;

  for (let index = from; index < to; index++) {
    const char = query[index];
    const next = query[index + 1];

    if (quote) {
      if (char === '\\' && next !== undefined) {
        index++;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < to && query[index] !== '\n') {
        index++;
      }
      continue;
    }
    if (char === '/' && next === '*') {
      const end = query.indexOf('*/', index + 2);
      index = end === -1 ? to : end + 1;
      continue;
    }

    visit(index, char, depth);
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '(' || char === '[') {
      depth++;
    } else if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1);
    }
  }
}

/** The parenthesized groups that are not inside another bracket, as the offsets of their brackets. */
function topLevelGroups(
  query: string,
  from: number,
  to: number
): Array<{ open: number; close: number }> {
  const groups: Array<{ open: number; close: number }> = [];
  let open: number | undefined;

  scanCode(query, from, to, (index, char, depth) => {
    if (char === '(' && depth === 0) {
      open = index;
    } else if (char === ')' && depth === 1 && open !== undefined) {
      groups.push({ open, close: index });
      open = undefined;
    }
  });
  return groups;
}

function splitRange(query: string, from: number, to: number, isTopLevel: boolean): QueryCommand[] {
  const pipes: number[] = [];
  scanCode(query, from, to, (index, char, depth) => {
    if (char === '|' && depth === 0) {
      pipes.push(index);
    }
  });

  const segments = [from - 1, ...pipes].map((pipe, position) => ({
    from: pipe + 1,
    to: position < pipes.length ? pipes[position] : to,
  }));

  return segments.flatMap((segment) => {
    const raw = query.slice(segment.from, segment.to);
    const text = raw.trim();
    const name = /^[A-Za-z_]+/.exec(stripComments(text).trim())?.[0]?.toUpperCase();
    if (text.length === 0 || !name) {
      return [];
    }

    const start = segment.from + raw.indexOf(text);
    const end = start + text.length;
    const command: QueryCommand = { name, text, start, end };

    if (isTopLevel && (name === 'FROM' || name === 'FORK')) {
      const branches = topLevelGroups(query, start, end)
        .map((group) => splitRange(query, group.open + 1, group.close, false))
        .filter((branch) => branch.length > 0);
      if (branches.length > 0) {
        command.branches = branches;
      }
    }
    return [command];
  });
}

/**
 * Splits an ES|QL query into its commands at the pipes that are not inside strings, brackets or
 * comments. A FROM or FORK command with queries in parentheses gets them as `branches`. It does not
 * parse the query, so it is enough to label commands but not to validate them. Offsets point into
 * the original query, so they can be used to find the commands in an editor.
 */
export function splitQueryCommands(query: string): QueryCommand[] {
  return splitRange(query, 0, query.length, true);
}
