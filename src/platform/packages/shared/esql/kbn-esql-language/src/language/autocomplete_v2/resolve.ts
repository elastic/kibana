/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExpressionEntry, resolveRole } from '../../esql_js_sim/definitions';
import type { CursorIR, ExpectedArgument } from '../../esql_js_sim/grammar';
import type { SuggestionRequest } from './types';

// The tokens inside an expression are offered with it, as its operators and its brackets.
const isOfExpression = (path: string[]): boolean =>
  getExpressionEntry(path) !== undefined && resolveRole(path)?.role.kind === 'expression';

/**
 * Turns what the grammar says about the cursor into what has to be offered there. It is pure:
 * nothing is fetched, and the same cursor always gives the same requests.
 */
export const resolve = (ir: CursorIR): SuggestionRequest[] => {
  const requests: SuggestionRequest[] = [];
  const commandRules = [
    ...new Set(
      ir.followers.flatMap(({ startsCommand, command }) =>
        startsCommand && command ? [command] : []
      )
    ),
  ];

  if (commandRules.length) {
    requests.push({ kind: 'command_names', commandRules });
  }

  for (const follower of ir.followers) {
    if (follower.startsCommand) {
      continue;
    }
    // The end of the query stands for the end of the command: the editor offers a new line.
    if (follower.class === 'end') {
      requests.push({ kind: 'end_of_command' });
    } else if (follower.text !== undefined && !isOfExpression(follower.path)) {
      requests.push({ kind: 'token', follower });
    }
  }

  // A token with no fixed text that a rule takes directly is an argument too, as a METADATA
  // field: it has a call site and a role like one the grammar gives a rule to.
  const valueTokens: ExpectedArgument[] = ir.followers.flatMap(
    ({ class: tokenClass, id, path, token, command }) =>
      tokenClass === 'value' && id
        ? [{ id, rule: token, path: [...path, id], command, continues: false }]
        : []
  );

  // An argument is offered once per role: several paths of the grammar lead to the same one.
  const seen = new Set<string>();
  const isNew = (key: string): boolean => !seen.has(key) && Boolean(seen.add(key));

  for (const argument of [...ir.arguments, ...valueTokens]) {
    const resolved = resolveRole(argument.path, argument.rule);
    const key = resolved?.id ?? `${argument.id}|${resolved?.role.kind}`;

    if (resolved?.role.kind !== 'expression' && isNew(key)) {
      requests.push({ kind: 'argument', argument, resolved });
    }
  }

  // An expression is offered as a whole: its operands where an argument is expected in it, and
  // its operators where a token of it can follow.
  for (const { path } of [...ir.arguments, ...ir.followers]) {
    const entry = getExpressionEntry(path);
    const resolved = entry === undefined ? undefined : resolveRole(path);

    if (entry && resolved?.role.kind === 'expression' && isNew(`expression|${entry}`)) {
      requests.push({ kind: 'expression', role: resolved.role, resolved, entry });
    }
  }

  return requests;
};
