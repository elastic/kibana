/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import { summary } from '../../../../commands/registry/stats/summary';
import { getSummaryPerCommand } from '@kbn/esql-utils/src/utils/get_query_summary';
import { Walker } from '../../../walker';
import { LeafPrinter } from '../../../../pretty_print';
import { Builder } from '../../../builder';
import { singleItems } from '../../../visitor/utils';
import type {
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLList,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLProperNode,
} from '../../../../types';
import * as generic from '../../generic';
import { isColumn, isFunctionExpression, isParamLiteral } from '../../../is';
import type { EsqlQuery } from '../../../../composer/query';

/**
 * Lists all "LIMIT" commands in the query AST.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @returns A collection of "LIMIT" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLCommand> => {
  return generic.commands.list(ast, (cmd) => cmd.name === 'stats');
};

/**
 * Retrieves the "LIMIT" command at the specified index in order of appearance.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @param index The index of the "LIMIT" command to retrieve.
 * @returns The "LIMIT" command at the specified index, if any.
 */
export const byIndex = (ast: ESQLAstQueryExpression, index: number): ESQLCommand | undefined => {
  return [...list(ast)][index];
};

/**
 * Summary of a STATS command.
 */
export interface StatsCommandSummary {
  /**
   * The "STATS" command AST node from which this summary was produced.
   */
  command: ESQLCommand;

  /**
   * Summary of the main arguments of the "STATS" command.
   */
  aggregates: Set<StatsFieldSummary>; // HD remove all interface

  /**
   * Summary of the "BY" arguments of the "STATS" command.
   */
  grouping: Set<StatsFieldSummary>;
}

/**
 * Summary of STATS command "aggregates" section (main arguments).
 *
 *    STATS <aggregates> [ BY <grouping> ]
 */
export interface StatsFieldSummary {
  /**
   * STATS command argument AST node (as was parsed).
   */
  arg: ESQLProperNode; // HD can be cleaned

  /**
   * The field name, correctly formatted, extracted from the AST.
   */
  field: string;

  /**
   * A `column` or param AST node, which represents the field name. If no column
   * AST node was found, a new one "virtual" column node is created.
   */
  // column: ESQLColumn | ESQLParamLiteral;

  /**
   * The definition of the field, which is the right-hand side of the `=`
   * operator, or the argument itself if no `=` operator is present.
   */
  definition: ESQLProperNode;

  /**
   * A list of terminal nodes that were found in the definition.
   */
  // terminals: Array<ESQLColumn | ESQLLiteral | ESQLList>;

  /**
   * A formatted list of field names which were used for new field
   * construction. For example, in the below example, `x` and `y` are the
   * existing "used" fields:
   *
   * ```
   * STATS foo = agg(x) BY y, bar = x
   * ```
   */
  usedFields: Set<string>; // HD can be cleaned
}

const summarizeArgParts = (
  query: EsqlQuery,
  arg: ESQLProperNode
): [field: string, column: ESQLColumn | ESQLParamLiteral, definition: ESQLProperNode] => {
  if (isParamLiteral(arg)) {
    return [LeafPrinter.param(arg), arg, arg];
  }

  if (isColumn(arg)) {
    return [LeafPrinter.column(arg), arg, arg];
  }

  if (isFunctionExpression(arg) && arg.name === '=' && isColumn(arg.args[0])) {
    const [column, definition] = singleItems(arg.args);

    return [
      LeafPrinter.column(column as ESQLColumn),
      column as ESQLColumn,
      definition as ESQLProperNode,
    ];
  }

  const name = [...query.src].slice(arg.location.min, arg.location.max + 1).join('');
  const args = [Builder.identifier({ name })];
  const column = Builder.expression.column({ args });

  return [LeafPrinter.column(column), column, arg];
};

/**
 * Returns a summary of the STATS command.
 *
 * @param query Query which contains the AST and source code.
 * @param command The STATS command AST node to summarize.
 * @returns Summary of the STATS command.
 */
export const summarizeCommand = (query: EsqlQuery, command: ESQLCommand): StatsCommandSummary => {
  const result = getSummaryPerCommand(query.src, command);

  return {
    ...result,
    command,
  };
};

export const getFieldTerminals = (definition: ESQLProperNode) => {
  const terminals: Array<ESQLColumn | ESQLLiteral | ESQLList> = [];

  Walker.walk(definition, {
    visitLiteral(node) {
      terminals.push(node);
    },
    visitColumn(node) {
      terminals.push(node);
    },
    visitListLiteral(node) {
      terminals.push(node);
    },
  });

  return terminals;
};

export const getUsedFields = (definition: ESQLProperNode) => {
  const usedFields: Set<string> = new Set();

  Walker.walk(definition, {
    visitColumn(node) {
      usedFields.add(LeafPrinter.column(node));
    },
  });

  return usedFields;
};

/**
 * Summarizes all STATS commands in the query.
 *
 * @param query Query to summarize.
 * @returns Returns a list of summaries for all STATS commands in the query in
 *     order of appearance.
 */
export const summarize = (query: EsqlQuery): StatsCommandSummary[] => {
  const summaries: StatsCommandSummary[] = [];

  for (const command of list(query.ast)) {
    const summary = summarizeCommand(query, command);
    summaries.push(summary);
  }

  return summaries;
};
