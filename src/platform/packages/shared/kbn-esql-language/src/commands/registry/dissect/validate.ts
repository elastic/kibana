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
import { isLiteral, isInlineCast, isOptionNode } from '../../../ast/is';
import type {
  ESQLColumn,
  ESQLAstAllCommands,
  ESQLMessage,
  ESQLCommandOption,
  ESQLAst,
} from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { validateCommandArguments } from '../../definitions/utils/validation';

const validateColumnForGrokDissect = (command: ESQLAstAllCommands, context?: ICommandContext) => {
  const acceptedColumnTypes: EsqlFieldType[] = ['keyword', 'text'];
  const astCol = command.args[0] as ESQLColumn;
  const columnRef = context?.columns.get(astCol.name);

  if (columnRef && !acceptedColumnTypes.includes(columnRef.type as EsqlFieldType)) {
    return [
      getMessageFromId({
        messageId: 'unsupportedColumnTypeForCommand',
        values: {
          command: command.name.toUpperCase(),
          type: acceptedColumnTypes.join(', '),
          givenType: columnRef.type,
          column: astCol.name,
        },
        locations: astCol.location,
      }),
    ];
  }

  return [];
};

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = validateColumnForGrokDissect(command, context);

  const appendSeparatorClause = command.args.find((arg) => isOptionNode(arg)) as
    | ESQLCommandOption
    | undefined;

  if (!appendSeparatorClause) {
    return messages;
  }

  if (appendSeparatorClause.name !== 'append_separator') {
    messages.push(
      getMessageFromId({
        messageId: 'unknownDissectKeyword',
        values: { keyword: appendSeparatorClause.name },
        locations: appendSeparatorClause.location,
      })
    );
    return messages;
  }

  const [firstArg] = appendSeparatorClause.args;
  if (!Array.isArray(firstArg) && (!isLiteral(firstArg) || firstArg.literalType !== 'keyword')) {
    const value = 'value' in firstArg && !isInlineCast(firstArg) ? firstArg.value : firstArg.name;
    messages.push(
      getMessageFromId({
        messageId: 'wrongDissectOptionArgumentType',
        values: { value: (value as string | number) ?? '' },
        locations: firstArg.location,
      })
    );
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));
  return messages;
};
