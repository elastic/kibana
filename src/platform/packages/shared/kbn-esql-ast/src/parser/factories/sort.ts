/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParserRuleContext } from 'antlr4';
import { OrderExpressionContext, SortCommandContext } from '../../antlr/esql_parser';
import { Builder } from '../../builder';
import { ESQLAstItem, ESQLColumn, ESQLOrderExpression } from '../../types';
import { createCommand, createParserFields } from '../factories';
import { collectBooleanExpression } from '../walkers';

export const createSortCommand = (ctx: SortCommandContext) => {
  const command = createCommand('sort', ctx);
  command.args.push(...visitOrderExpressions(ctx.orderExpression_list()));
  return command;
};

export function visitOrderExpressions(
  ctx: OrderExpressionContext[]
): Array<ESQLOrderExpression | ESQLAstItem> {
  const ast: Array<ESQLOrderExpression | ESQLAstItem> = [];

  for (const orderCtx of ctx) {
    ast.push(visitOrderExpression(orderCtx));
  }

  return ast;
}

const visitOrderExpression = (ctx: OrderExpressionContext): ESQLOrderExpression | ESQLAstItem => {
  const arg = collectBooleanExpression(ctx.booleanExpression())[0];

  let order: ESQLOrderExpression['order'] = '';
  let nulls: ESQLOrderExpression['nulls'] = '';

  const ordering = ctx._ordering?.text?.toUpperCase();

  if (ordering) order = ordering as ESQLOrderExpression['order'];

  const nullOrdering = ctx._nullOrdering?.text?.toUpperCase();

  switch (nullOrdering) {
    case 'LAST':
      nulls = 'NULLS LAST';
      break;
    case 'FIRST':
      nulls = 'NULLS FIRST';
      break;
  }

  if (!order && !nulls) {
    return arg;
  }

  return createOrderExpression(ctx, arg as ESQLColumn, order, nulls);
};

const createOrderExpression = (
  ctx: ParserRuleContext,
  arg: ESQLColumn,
  order: ESQLOrderExpression['order'],
  nulls: ESQLOrderExpression['nulls']
) => {
  const node = Builder.expression.order(
    arg as ESQLColumn,
    { order, nulls },
    createParserFields(ctx)
  );

  return node;
};
