/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, Parser } from '@elastic/esql';

const quoteFieldName = (fieldName: string): string =>
  /[^a-zA-Z0-9_]/.test(fieldName) ? `\`${fieldName}\`` : fieldName;

/**
 * Rewrites an ES|QL query to group by the given field name.
 * If the query already has a STATS command, the BY clause is replaced (preserving aggregations).
 * If there is no STATS command, one is appended.
 */
export const setGroupByField = (queryString: string, fieldName: string): string => {
  const { root } = Parser.parse(queryString);
  const commands = root.commands;

  let lastStatsIndex = -1;
  for (let i = commands.length - 1; i >= 0; i--) {
    if (commands[i].name === 'stats') {
      lastStatsIndex = i;
      break;
    }
  }

  if (lastStatsIndex === -1) {
    return `${queryString}\n| STATS count = COUNT(*) BY ${quoteFieldName(fieldName)}`;
  }

  const statsCommand = commands[lastStatsIndex];
  const byOption = statsCommand.args.find(
    (arg: any) => arg.type === 'option' && arg.name === 'by'
  ) as any;

  const quotedField = quoteFieldName(fieldName);
  const { root: newRoot } = Parser.parse(`FROM x | STATS BY ${quotedField}`);
  const newStats = newRoot.commands.find((c: any) => c.name === 'stats') as any;
  const newBy = newStats?.args.find((a: any) => a.type === 'option' && a.name === 'by') as any;

  if (!newBy) return queryString;

  if (byOption) {
    byOption.args = newBy.args;
  } else {
    statsCommand.args.push(newBy);
  }

  return BasicPrettyPrinter.print(root);
};
