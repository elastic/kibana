/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLAst, ESQLMessage } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
import { errors } from '../../definitions/utils/errors';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { getByOption } from './utils';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const byOption = getByOption(command);
  if (byOption) {
    const commandIndex = ast.findIndex((astCommand) => astCommand === command);
    const hasSortBeforeLimit = ast
      .slice(0, commandIndex)
      .some((astCommand) => astCommand.name === Commands.SORT);

    if (hasSortBeforeLimit) {
      messages.push(
        // TODO: Remove this temporary validation once Elasticsearch supports SORT before LIMIT BY.
        errors.unexpected(command.location, 'SORT before LIMIT BY is not supported yet.')
      );
    }
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
