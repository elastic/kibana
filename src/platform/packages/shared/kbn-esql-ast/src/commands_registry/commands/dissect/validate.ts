/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getMessageFromId } from '../../../definitions/utils/errors';
import { isLiteral, isInlineCast, isOptionNode } from '../../../ast/is';
import type {
  ESQLColumn,
  ESQLCommand,
  ESQLMessage,
  ESQLCommandOption,
  ESQLAst,
} from '../../../types';
import type { ICommandContext } from '../../types';
import type { FieldType } from '../../../definitions/types';
import { validateCommandArguments } from '../../../definitions/utils/validation';

const validateColumnForGrokDissect = (command: ESQLCommand, context?: ICommandContext) => {
  const acceptedColumnTypes: FieldType[] = ['keyword', 'text'];
  const astCol = command.args[0] as ESQLColumn;
  const columnRef = context?.fields.get(astCol.name);

  if (columnRef && !acceptedColumnTypes.includes(columnRef.type)) {
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
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
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

  messages.push(...validateCommandArguments(command, ast, context));
  return messages;
};
