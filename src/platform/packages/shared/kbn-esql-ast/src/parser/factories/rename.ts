/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RenameCommandContext } from '../../antlr/esql_parser';
import { ESQLCommand } from '../../types';
import { createCommand } from '../factories';
import { visitRenameClauses } from '../walkers';

export const createRenameCommand = (ctx: RenameCommandContext): ESQLCommand<'rename'> => {
  const command = createCommand('rename', ctx);
  const renameArgs = visitRenameClauses(ctx.renameClause_list());

  command.args.push(...renameArgs);

  return command;
};
