/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { errors } from '../../definitions/utils';
import type {
  ESQLAst,
  ESQLAstAllCommands,
  ESQLAstChangePointCommand,
  ESQLMessage,
} from '../../../types';
import { isColumn, isOptionNode } from '../../../ast/is';
import type { SupportedDataType } from '../../definitions/types';
import { isNumericType } from '../../definitions/types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { validateCommandArguments } from '../../definitions/utils/validation';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const changePointCommand = command as ESQLAstChangePointCommand;
  const messages: ESQLMessage[] = [];

  // validate change point value column
  const valueArg = changePointCommand.args[0];
  if (isColumn(valueArg)) {
    const columnName = valueArg.name;
    let valueColumnType: SupportedDataType | 'unknown' | undefined;

    if (context?.columns.has(columnName)) {
      valueColumnType = context?.columns.get(columnName)?.type;
    }

    if (valueColumnType && !isNumericType(valueColumnType)) {
      messages.push(errors.changePointWrongFieldType(valueArg, valueColumnType));
    }
  }

  // validate ON column
  const defaultOnColumnName = '@timestamp';
  const onColumn = changePointCommand.args.find((arg) => isOptionNode(arg) && arg.name === 'on');
  const hasDefaultOnColumn = context?.columns.has(defaultOnColumnName);
  if (!onColumn && !hasDefaultOnColumn) {
    messages.push({
      location: changePointCommand.location,
      text: i18n.translate('kbn-esql-language.esql.validation.changePointOnFieldMissing', {
        defaultMessage: '[CHANGE_POINT] Default {defaultOnColumnName} column is missing',
        values: { defaultOnColumnName },
      }),
      type: 'error',
      code: 'changePointOnFieldMissing',
    });
  }

  messages.push(
    ...validateCommandArguments(
      // exclude AS option from generic validation
      {
        ...changePointCommand,
        args: changePointCommand.args.filter((arg) => !(isOptionNode(arg) && arg.name === 'as')),
      },
      ast,
      context,
      callbacks
    )
  );

  return messages;
};
