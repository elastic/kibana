/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CompositeForkSubQueryContext,
  ForkCommandContext,
  ForkSubQueryProcessingCommandContext,
  SingleForkSubQueryCommandContext,
} from '../../antlr/esql_parser';
import { ESQLCommand } from '../../types';
import { createCommand } from '../factories';
import { createLimitCommand } from './limit';
import { createSortCommand } from './sort';
import { createWhereCommand } from './where';

export const createForkCommand = (ctx: ForkCommandContext): ESQLCommand<'fork'> => {
  const command = createCommand<'fork'>('fork', ctx);

  const subCommandContexts = ctx
    .forkSubQueries()
    .forkSubQuery_list()
    .map((subQueryCtx) => subQueryCtx.forkSubQueryCommand());

  for (const subCtx of subCommandContexts) {
    if (subCtx instanceof SingleForkSubQueryCommandContext) {
      command.args.push(
        visitForkSubQueryProcessingCommandContext(subCtx.forkSubQueryProcessingCommand())
      );
    }

    if (subCtx instanceof CompositeForkSubQueryContext) {
      // const commandCtx = subCtx.forkSubQueryCommand();
    }
  }

  return command;
};

function visitForkSubQueryProcessingCommandContext(ctx: ForkSubQueryProcessingCommandContext) {
  const whereCtx = ctx.whereCommand();
  if (whereCtx) {
    return createWhereCommand(whereCtx);
  }

  const sortCtx = ctx.sortCommand();
  if (sortCtx) {
    return createSortCommand(sortCtx);
  }

  const limitCtx = ctx.limitCommand();
  if (limitCtx) {
    return createLimitCommand(limitCtx);
  }
}
