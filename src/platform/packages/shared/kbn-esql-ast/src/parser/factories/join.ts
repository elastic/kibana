/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { JoinCommandContext, JoinTargetContext } from '../../antlr/esql_parser';
import { ESQLAstItem, ESQLAstJoinCommand, ESQLIdentifier, ESQLSource } from '../../types';
import { createCommand, createOption, createSource } from '../factories';
import { visitValueExpression } from '../walkers';

const createNodeFromJoinTarget = (ctx: JoinTargetContext): ESQLSource | ESQLIdentifier => {
  return createSource(ctx._index);
};

export const createJoinCommand = (ctx: JoinCommandContext): ESQLAstJoinCommand => {
  const command = createCommand<'join', ESQLAstJoinCommand>('join', ctx);

  // Pick-up the <TYPE> of the command.
  command.commandType = (
    ctx._type_?.text ?? 'lookup'
  ).toLocaleLowerCase() as ESQLAstJoinCommand['commandType'];

  const joinTarget = createNodeFromJoinTarget(ctx.joinTarget());
  const joinCondition = ctx.joinCondition();
  const onOption = createOption('on', joinCondition);
  const joinPredicates: ESQLAstItem[] = onOption.args;

  for (const joinPredicateCtx of joinCondition.joinPredicate_list()) {
    const expression = visitValueExpression(joinPredicateCtx.valueExpression());

    if (expression) {
      joinPredicates.push(expression);
    }
  }

  command.args.push(joinTarget);

  if (onOption.args.length) {
    command.args.push(onOption);
  }

  return command;
};
