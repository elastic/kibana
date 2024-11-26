/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../../walker';
import { Visitor } from '../../../visitor';
import { LeafPrinter } from '../../../pretty_print';
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
  ESQLTimeInterval,
} from '../../../types';
import * as generic from '../../generic';
import { isColumn, isFunctionExpression, isParamLiteral } from '../../../ast/helpers';
import type { EsqlQuery } from '../../../query';

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
  aggregates: Record<string, StatsFieldSummary>;

  /**
   * Summary of the "BY" arguments of the "STATS" command.
   */
  grouping: Record<string, StatsFieldSummary>;

  /**
   * A formatted list of field names which were newly created by the
   * STATS command.
   */
  newFields: Set<string>;

  /**
   * De-duplicated list all of field names, which were used to as-is or to
   * construct new fields. The fields are correctly formatted according to
   * ES|QL column formatting rules.
   */
  usedFields: Set<string>;
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
  arg: ESQLProperNode;

  /**
   * The field name, correctly formatted, extracted from the AST.
   */
  field: string;

  /**
   * A `column` or param AST node, which represents the field name. If no column
   * AST node was found, a new one "virtual" column node is created.
   */
  column: ESQLColumn | ESQLParamLiteral;

  /**
   * The definition of the field, which is the right-hand side of the `=`
   * operator, or the argument itself if no `=` operator is present.
   */
  definition: ESQLProperNode;

  /**
   * A list of terminal nodes that were found in the definition.
   */
  terminals: Array<ESQLColumn | ESQLLiteral | ESQLList | ESQLTimeInterval>;

  /**
   * A formatted list of field names which were used for new field
   * construction. For example, in the below example, `x` and `y` are the
   * existing "used" fields:
   *
   * ```
   * STATS foo = agg(x) BY y, bar = x
   * ```
   */
  usedFields: Set<string>;
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

const summarizeField = (query: EsqlQuery, arg: ESQLProperNode): StatsFieldSummary => {
  const [field, column, definition] = summarizeArgParts(query, arg);
  const terminals: StatsFieldSummary['terminals'] = [];
  const usedFields: StatsFieldSummary['usedFields'] = new Set();

  Walker.walk(definition, {
    visitLiteral(node) {
      terminals.push(node);
    },
    visitColumn(node) {
      terminals.push(node);
      usedFields.add(LeafPrinter.column(node));
    },
    visitListLiteral(node) {
      terminals.push(node);
    },
    visitTimeIntervalLiteral(node) {
      terminals.push(node);
    },
  });

  const summary: StatsFieldSummary = {
    arg,
    field,
    column,
    definition,
    terminals,
    usedFields,
  };

  return summary;
};

/**
 * Returns a summary of the STATS command.
 *
 * @param query Query which contains the AST and source code.
 * @param command The STATS command AST node to summarize.
 * @returns Summary of the STATS command.
 */
export const summarizeCommand = (query: EsqlQuery, command: ESQLCommand): StatsCommandSummary => {
  const aggregates: StatsCommandSummary['aggregates'] = {};
  const grouping: StatsCommandSummary['grouping'] = {};
  const newFields: StatsCommandSummary['newFields'] = new Set();
  const usedFields: StatsCommandSummary['usedFields'] = new Set();

  // Process main arguments, the "aggregates" part of the command.
  new Visitor()
    .on('visitExpression', (ctx) => {
      const summary = summarizeField(query, ctx.node);
      aggregates[summary.field] = summary;
      newFields.add(summary.field);
      for (const field of summary.usedFields) usedFields.add(field);
    })
    .on('visitCommand', () => {})
    .on('visitStatsCommand', (ctx) => {
      for (const _ of ctx.visitArguments());
    })
    .visitCommand(command);

  // Process the "BY" arguments, the "grouping" part of the command.
  new Visitor()
    .on('visitExpression', (ctx) => {
      const node = ctx.node;
      const summary = summarizeField(query, node);
      newFields.add(summary.field);
      for (const field of summary.usedFields) usedFields.add(field);
      grouping[summary.field] = summary;
    })
    .on('visitCommandOption', (ctx) => {
      if (ctx.node.name !== 'by') return;
      for (const _ of ctx.visitArguments());
    })
    .on('visitCommand', () => {})
    .on('visitStatsCommand', (ctx) => {
      for (const _ of ctx.visitOptions());
    })
    .visitCommand(command);

  const summary: StatsCommandSummary = {
    command,
    aggregates,
    grouping,
    newFields,
    usedFields,
  };

  return summary;
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
