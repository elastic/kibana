/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ColumnExpressionVisitorContext,
  LiteralExpressionVisitorContext,
  FunctionCallExpressionVisitorContext,
  CommandOptionVisitorContext,
  StatsCommandVisitorContext,
  InlineStatsCommandVisitorContext,
  SharedData,
} from '../../../ast/visitor';
import { Visitor } from '../../../ast/visitor';
import { singleItems } from '../../../ast';
import { isAssignment, isColumn, isParamLiteral, isWhereExpression } from '../../../ast/is';
import type { ESQLColumn, ESQLCommand } from '../../../types';
import type { ESQLCommandSummary, FieldSummary } from '../types';
import { getColumnName } from '../../definitions/utils/columns';
import type { VisitorMethods } from '../../../ast/visitor/types';

interface SummaryData extends SharedData {
  newColumns: string[];
  grouping: FieldSummary[];
  aggregates: FieldSummary[];
  query: string;
}

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const data: SummaryData = {
    newColumns: [],
    grouping: [],
    aggregates: [],
    query,
  };

  new Visitor<VisitorMethods, SummaryData>({ data })
    .on('visitCommand', () => {})
    .on('visitStatsCommand', collectInStats)
    .on('visitInlineStatsCommand', collectInStats)
    .on('visitCommandOption', collectInCommandOption)
    .on('visitExpression', () => {})
    .on('visitColumnExpression', collectInColumns)
    .on('visitLiteralExpression', collectInLiterals)
    .on('visitFunctionCallExpression', collectInFunctions)
    .visitCommand(command);

  return {
    newColumns: new Set(data.newColumns),
    grouping: new Set(data.grouping),
    aggregates: new Set(data.aggregates),
  };
};

// ======= Visitor Handlers =======

/**
 * Visites its arguments and options.
 */
const collectInStats = (
  ctx:
    | StatsCommandVisitorContext<VisitorMethods, SummaryData>
    | InlineStatsCommandVisitorContext<VisitorMethods, SummaryData>
) => {
  for (const _ of ctx.visitArguments(false)); // Arguments corresponds to the "aggregates" part
  for (const _ of ctx.visitOptions(false)); // Options corresponds to the "grouping" part "BY"
};

/**
 * If BY option is found, sets a flag and continues visiting its arguments.
 */
const collectInCommandOption = (ctx: CommandOptionVisitorContext<VisitorMethods, SummaryData>) => {
  const isInByClause = ctx.node.name === 'by';
  for (const _ of ctx.visitArguments(isInByClause));
};

/**
 * Collects the columns used directly as arguments.
 */
const collectInColumns = (
  ctx: ColumnExpressionVisitorContext<VisitorMethods, SummaryData>,
  isInByClause: boolean
) => {
  const { newColumns, grouping, aggregates } = ctx.ctx.data;
  const column = ctx.node;
  const newColumn = {
    field: getColumnName(column),
    arg: column,
  };
  if (!isInByClause) {
    newColumns.push(newColumn.field);
    aggregates.push(newColumn);
  } else {
    grouping.push(newColumn);
  }
};

/**
 * Collects the param variables.
 */
const collectInLiterals = (
  ctx: LiteralExpressionVisitorContext<VisitorMethods, SummaryData>,
  isInByClause: boolean
) => {
  const { grouping, aggregates } = ctx.ctx.data;
  const literal = ctx.node;
  if (isParamLiteral(literal)) {
    const newColumn = {
      field: literal.text,
      arg: literal,
    };
    if (!isInByClause) {
      aggregates.push(newColumn);
    } else {
      grouping.push(newColumn);
    }
  }
};

/**
 * Collects columns from assignments, "where" expressions, and other functions calls.
 */
const collectInFunctions = (
  ctx: FunctionCallExpressionVisitorContext<VisitorMethods, SummaryData>,
  isInByClause: boolean
) => {
  const { newColumns, grouping, aggregates, query } = ctx.ctx.data;
  const expression = ctx.node;

  // Assignment expression, STATS var=AVG(field)
  if (isAssignment(expression) && isColumn(expression.args[0])) {
    // From the asignment, we extract the left side (fisrt argument) as the new column
    const [column] = singleItems(expression.args);

    const newColumn = {
      field: getColumnName(column as ESQLColumn),
      arg: expression,
    };

    newColumns.push(newColumn.field);
    if (isInByClause) {
      grouping.push(newColumn);
    } else {
      aggregates.push(newColumn);
    }
    return;
  }

  // Where expression, we only look for columns in the left side of the expression (first argument)
  if (isWhereExpression(expression)) {
    ctx.visitArgument(0, isInByClause);
    return;
  }

  // By default uses the expression text as column name:
  // STATS AVG(field) => new column "AVG(field)"
  const name = query.substring(expression.location.min, expression.location.max + 1);

  newColumns.push(name);

  const newColumn = {
    field: name,
    arg: expression,
  };
  if (isInByClause) {
    grouping.push(newColumn);
  } else {
    aggregates.push(newColumn);
  }
};
