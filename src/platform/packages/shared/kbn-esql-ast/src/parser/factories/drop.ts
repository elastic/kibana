/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DropCommandContext } from '../../antlr/esql_parser';
import { ESQLCommand } from '../../types';
import { createCommand } from '../factories';
import { collectAllColumnIdentifiers } from '../walkers';

export const createDropCommand = (ctx: DropCommandContext): ESQLCommand<'drop'> => {
  const command = createCommand('drop', ctx);
  const identifiers = collectAllColumnIdentifiers(ctx);

  command.args.push(...identifiers);

  return command;
};
