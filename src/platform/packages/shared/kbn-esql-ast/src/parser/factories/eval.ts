/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EvalCommandContext } from '../../antlr/esql_parser';
import { ESQLCommand } from '../../types';
import { createCommand } from '../factories';
import { collectAllFields } from '../walkers';

export const createEvalCommand = (ctx: EvalCommandContext): ESQLCommand<'eval'> => {
  const command = createCommand('eval', ctx);
  const fields = collectAllFields(ctx.fields());

  command.args.push(...fields);

  return command;
};
