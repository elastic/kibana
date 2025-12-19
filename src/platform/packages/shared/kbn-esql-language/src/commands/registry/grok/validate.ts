/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EsqlFieldType } from '@kbn/esql-types';
import { getMessageFromId } from '../../definitions/utils/errors';
import type { ESQLAst, ESQLColumn, ESQLAstAllCommands, ESQLMessage } from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { validateCommandArguments } from '../../definitions/utils/validation';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const acceptedColumnTypes: EsqlFieldType[] = ['keyword', 'text'];
  const astCol = command.args[0] as ESQLColumn;
  const columnRef = context?.columns.get(astCol.name);

  if (columnRef && !acceptedColumnTypes.includes(columnRef.type as EsqlFieldType)) {
    messages.push(
      getMessageFromId({
        messageId: 'unsupportedColumnTypeForCommand',
        values: {
          command: command.name.toUpperCase(),
          type: acceptedColumnTypes.join(', '),
          givenType: columnRef.type,
          column: astCol.name,
        },
        locations: astCol.location,
      })
    );
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
