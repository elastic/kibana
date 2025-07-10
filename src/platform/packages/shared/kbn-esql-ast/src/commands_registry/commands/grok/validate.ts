/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getMessageFromId } from '../../../definitions/utils/errors';
import type { ESQLAst, ESQLColumn, ESQLCommand, ESQLMessage } from '../../../types';
import type { ICommandContext } from '../../types';
import type { FieldType } from '../../../definitions/types';
import { validateCommandArguments } from '../../../definitions/utils/validation';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const acceptedColumnTypes: FieldType[] = ['keyword', 'text'];
  const astCol = command.args[0] as ESQLColumn;
  const columnRef = context?.fields.get(astCol.name);

  if (columnRef && !acceptedColumnTypes.includes(columnRef.type)) {
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

  messages.push(...validateCommandArguments(command, ast, context));

  return messages;
};
