/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isOptionNode, isLiteral, isParamLiteral } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLCommandOption, ESQLColumn } from '@elastic/esql/types';

export type LimitCaretPosition = 'after_limit_keyword' | 'after_value' | 'grouping_expression';

const ENDS_WITH_WHITESPACE_REGEX = /\s+$/;

export function getPosition(command: ESQLAstAllCommands, innerText: string): LimitCaretPosition {
  const lastCommandArg = command.args[command.args.length - 1];

  if (isOptionNode(lastCommandArg) && lastCommandArg.name === 'by') {
    return 'grouping_expression';
  }

  const rawFirstArg = command.args[0];
  const firstArg = Array.isArray(rawFirstArg) ? rawFirstArg[0] : rawFirstArg;
  const hasValue = firstArg && (isLiteral(firstArg) || isParamLiteral(firstArg));

  if (hasValue && ENDS_WITH_WHITESPACE_REGEX.test(innerText)) {
    return 'after_value';
  }

  return 'after_limit_keyword';
}

export function getByOption(command: ESQLAstAllCommands): ESQLCommandOption | undefined {
  return command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
    | ESQLCommandOption
    | undefined;
}

export function getByColumns(byNode: ESQLCommandOption | undefined): string[] {
  const columnNodes = (byNode?.args.filter((arg) => !Array.isArray(arg) && arg.type === 'column') ??
    []) as ESQLColumn[];

  return columnNodes.map((node) => node.parts.join('.'));
}
