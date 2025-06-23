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
import { createCompletionCommand } from './completion';
import { createChangePointCommand } from './change_point';
import { createGrokCommand } from './grok';
import { createKeepCommand } from './keep';
import { createMvExpandCommand } from './mv_expand';
import { createDropCommand } from './drop';
import { createRenameCommand } from './rename';
import { createEnrichCommand } from './enrich';
import { createSampleCommand } from './sample';
import { createJoinCommand } from './join';

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
  const whereCtx = ctx.processingCommand().whereCommand();
  if (whereCtx) {
    return createWhereCommand(whereCtx);
  }

  const sortCtx = ctx.processingCommand().sortCommand();
  if (sortCtx) {
    return createSortCommand(sortCtx);
  }

  const limitCtx = ctx.processingCommand().limitCommand();
  if (limitCtx) {
    return createLimitCommand(limitCtx);
  }

  const dissectCtx = ctx.processingCommand().dissectCommand();
  if (dissectCtx) {
    return createDissectCommand(dissectCtx);
  }

  const evalCtx = ctx.processingCommand().evalCommand();
  if (evalCtx) {
    return createEvalCommand(evalCtx);
  }

  const statsCtx = ctx.processingCommand().statsCommand();
  if (statsCtx) {
    return createStatsCommand(statsCtx);
  }

  const grokCtx = ctx.processingCommand().grokCommand();
  if (grokCtx) {
    return createGrokCommand(grokCtx);
  }

  const changePointCtx = ctx.processingCommand().changePointCommand();
  if (changePointCtx) {
    return createChangePointCommand(changePointCtx);
  }

  const completionCtx = ctx.processingCommand().completionCommand();
  if (completionCtx) {
    return createCompletionCommand(completionCtx);
  }

  const mvExpandCtx = ctx.processingCommand().mvExpandCommand();
  if (mvExpandCtx) {
    return createMvExpandCommand(mvExpandCtx);
  }

  const keepCtx = ctx.processingCommand().keepCommand();
  if (keepCtx) {
    return createKeepCommand(keepCtx);
  }

  const dropCtx = ctx.processingCommand().dropCommand();
  if (dropCtx) {
    return createDropCommand(dropCtx);
  }

  const renameCtx = ctx.processingCommand().renameCommand();
  if (renameCtx) {
    return createRenameCommand(renameCtx);
  }

  const enrichCtx = ctx.processingCommand().enrichCommand();
  if (enrichCtx) {
    return createEnrichCommand(enrichCtx);
  }

  const sampleCtx = ctx.processingCommand().sampleCommand();
  if (sampleCtx) {
    return createSampleCommand(sampleCtx);
  }

  const joinCtx = ctx.processingCommand().joinCommand();
  if (joinCtx) {
    return createJoinCommand(joinCtx);
  }
}
