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
  ForkSubQueryCommandContext,
  ForkSubQueryProcessingCommandContext,
  SingleForkSubQueryCommandContext,
} from '../../antlr/esql_parser';
import { Builder } from '../../builder';
import { ESQLCommand } from '../../types';
import { createCommand, createParserFields } from '../factories';
import { createDissectCommand } from './dissect';
import { createEvalCommand } from './eval';
import { createLimitCommand } from './limit';
import { createSortCommand } from './sort';
import { createStatsCommand } from './stats';
import { createWhereCommand } from './where';

export const createForkCommand = (ctx: ForkCommandContext): ESQLCommand<'fork'> => {
  const command = createCommand<'fork'>('fork', ctx);

  const subQueryContexts = ctx.forkSubQueries().forkSubQuery_list();

  for (const subCtx of subQueryContexts) {
    const subCommands = visitForkSubQueryContext(subCtx.forkSubQueryCommand());
    const branch = Builder.expression.query(subCommands, createParserFields(subCtx));
    command.args.push(branch);
  }

  return command;
};

function visitForkSubQueryContext(ctx: ForkSubQueryCommandContext) {
  const commands = [];

  let nextCtx: ForkSubQueryCommandContext = ctx;
  while (nextCtx instanceof CompositeForkSubQueryContext) {
    const command = visitForkSubQueryProcessingCommandContext(
      nextCtx.forkSubQueryProcessingCommand()
    );
    if (command) {
      commands.unshift(command);
    }

    nextCtx = nextCtx.forkSubQueryCommand();
  }

  if (nextCtx instanceof SingleForkSubQueryCommandContext) {
    const command = visitForkSubQueryProcessingCommandContext(
      nextCtx.forkSubQueryProcessingCommand()
    );
    if (command) {
      commands.unshift(command);
    }
  }

  return commands;
}

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

  const dissectCtx = ctx.dissectCommand();
  if (dissectCtx) {
    return createDissectCommand(dissectCtx);
  }

  const evalCtx = ctx.evalCommand();
  if (evalCtx) {
    return createEvalCommand(evalCtx);
  }

  const statsCtx = ctx.statsCommand();
  if (statsCtx) {
    return createStatsCommand(statsCtx);
  }
}
