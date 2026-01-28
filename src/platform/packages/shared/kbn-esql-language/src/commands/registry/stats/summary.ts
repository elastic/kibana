/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Visitor } from '../../../ast/visitor';
import { singleItems } from '../../../ast';
import { isAssignment, isColumn, isParamLiteral, isWhereExpression } from '../../../ast/is';
import type { ESQLColumn, ESQLCommand } from '../../../types';
import type { ESQLCommandSummary, FieldSummary } from '../types';
import { getColumnName } from '../../definitions/utils/columns';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const newColumns: string[] = [];
  const grouping: FieldSummary[] = [];
  const aggregates: FieldSummary[] = [];

  new Visitor()
    // Simple column reference.
    // We consider it a new column unless it's in the BY clause.
    // If its in the BY clause, we add it to the grouping fields.
    .on('visitColumnExpression', (ctx, isInByClause) => {
      const column = ctx.node;
      const newColumn = {
        field: getColumnName(column),
        arg: column,
        definition: column,
      };
      if (!isInByClause) {
        newColumns.push(newColumn.field);
        aggregates.push(newColumn);
      } else {
        grouping.push(newColumn);
      }
    })

    // Params
    .on('visitLiteralExpression', (ctx, isInByClause) => {
      const literal = ctx.node;
      if (isParamLiteral(literal)) {
        const newColumn = {
          field: literal.text,
          arg: literal,
          definition: literal,
        };
        if (!isInByClause) {
          aggregates.push(newColumn);
        } else {
          grouping.push(newColumn);
        }
      }
    })

    // Function expressions.
    // Extracts columns from assignments, "where" expressions, and other functions calls.
    .on('visitFunctionCallExpression', (ctx, isInByClause) => {
      const expression = ctx.node;

      // Assignment expression, STATS var=AVG(field)
      if (isAssignment(expression) && isColumn(expression.args[0])) {
        // From the asignment, we extract:
        // * The left side (fisrt argument) as the new column
        // * The right side (second argument) as the definition of that column
        const [column, definition] = singleItems(expression.args);

        const newColumn = {
          field: getColumnName(column as ESQLColumn),
          arg: expression,
          definition,
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
        definition: expression,
      };
      if (isInByClause) {
        grouping.push(newColumn);
      } else {
        aggregates.push(newColumn);
      }
    })

    // We set a flag to identify we are in the BY clause
    .on('visitCommandOption', (ctx) => {
      const isInByClause = ctx.node.name === 'by';
      for (const _ of ctx.visitArguments(isInByClause));
    })

    .on('visitExpression', (ctx, isInByClause) => () => {})
    .on('visitCommand', () => {})
    .on('visitStatsCommand', (ctx) => {
      for (const _ of ctx.visitArguments(false)); // Arguments corresponds to the "aggregates" part
      for (const _ of ctx.visitOptions()); // Options corresponds to the "grouping" part "BY"
    })
    .on('visitInlineStatsCommand', (ctx) => {
      for (const _ of ctx.visitArguments(false));
      for (const _ of ctx.visitOptions());
    })
    .visitCommand(command);

  return {
    newColumns: new Set(newColumns),
    grouping: new Set(grouping),
    aggregates: new Set(aggregates),
  };
};
