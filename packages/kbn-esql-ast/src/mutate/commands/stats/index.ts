/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../../walker';
import { LeafPrinter } from '../../../pretty_print';
import { Builder } from '../../../builder';
import { singleItems } from '../../../visitor/utils';
import type {
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLList,
  ESQLLiteral,
  ESQLProperNode,
  ESQLTimeInterval,
} from '../../../types';
import * as generic from '../../generic';
import { isColumn, isFunctionExpression } from '../../../ast/helpers';
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
  aggregates: Record<string, StatsAggregatesSummary>;

  /**
   * Summary of the "BY" arguments of the "STATS" command.
   */
  grouping: Record<string, ESQLColumn>;

  /**
   * De-duplicated list all of ES|QL-syntax formatted field names from the
   * {@link aggregates} and {@link grouping} fields.
   */
  fields: Set<string>;
}

/**
 * Summary of STATS command "aggregates" section (main arguments).
 *
 *    STATS <aggregates> [ BY <grouping> ]
 */
export interface StatsAggregatesSummary {
  /**
   * STATS command argument AST node (as was parsed).
   */
  arg: ESQLProperNode;

  /**
   * The field name, correctly formatted, extracted from the AST.
   */
  field: string;

  /**
   * A `column` AST node, which represents the field name. If no column AST node
   * was found, a new one "virtual" column node is created.
   */
  column: ESQLColumn;

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
   * Correctly formatted list of field names that were found in the {@link terminals}.
   */
  fields: string[];
}

const summarizeArgParts = (
  query: EsqlQuery,
  arg: ESQLProperNode
): [column: ESQLColumn, definition: ESQLProperNode] => {
  if (isFunctionExpression(arg) && arg.name === '=' && isColumn(arg.args[0])) {
    const [column, definition] = singleItems(arg.args);

    return [column as ESQLColumn, definition as ESQLProperNode];
  }

  let text = query.src.slice(arg.location.min, arg.location.max + 2);

  /**
   * @see https://github.com/elastic/kibana/issues/199319
   * @todo Remove this eventually. This works around a parser bug, where it
   *     sometimes grabs extra character
   */
  if (text[text.length - 2] === ')') {
    text = text.slice(0, -1);
  }

  const column = Builder.expression.column({ parts: [text] });

  return [column, arg];
};

const summarizeArg = (query: EsqlQuery, arg: ESQLProperNode): StatsAggregatesSummary => {
  const [column, definition] = summarizeArgParts(query, arg);
  const terminals: StatsAggregatesSummary['terminals'] = [];
  const fields: StatsAggregatesSummary['fields'] = [];

  Walker.walk(definition, {
    visitLiteral(node) {
      terminals.push(node);
    },
    visitColumn(node) {
      terminals.push(node);
      fields.push(LeafPrinter.column(node));
    },
    visitListLiteral(node) {
      terminals.push(node);
    },
    visitTimeIntervalLiteral(node) {
      terminals.push(node);
    },
  });

  const summary: StatsAggregatesSummary = {
    arg,
    field: LeafPrinter.column(column),
    column,
    definition,
    terminals,
    fields,
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
  const fields: StatsCommandSummary['fields'] = new Set();

  for (const arg of singleItems(command.args)) {
    const summary = summarizeArg(query, arg);
    aggregates[summary.field] = summary;
    for (const field of summary.fields) fields.add(field);
  }

  const summary: StatsCommandSummary = {
    command,
    aggregates,
    grouping: {},
    fields,
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
