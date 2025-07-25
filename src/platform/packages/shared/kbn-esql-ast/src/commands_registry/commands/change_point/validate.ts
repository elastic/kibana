/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAst, ESQLCommand, ESQLMessage } from '../../../types';
import { isColumn, isOptionNode } from '../../../ast/is';
import { isNumericType } from '../../../definitions/types';
import type { ICommandContext } from '../../types';
import { validateCommandArguments } from '../../../definitions/utils/validation';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  // validate change point value column
  const valueArg = command.args[0];
  if (isColumn(valueArg)) {
    const columnName = valueArg.name;
    // look up for columns in userDefinedColumns and existing fields
    let valueColumnType: string | undefined;
    const userDefinedColumnRef = context?.userDefinedColumns.get(columnName);
    if (userDefinedColumnRef) {
      valueColumnType = userDefinedColumnRef.find((v) => v.name === columnName)?.type;
    } else {
      const fieldRef = context?.fields.get(columnName);
      valueColumnType = fieldRef?.type;
    }

    if (valueColumnType && !isNumericType(valueColumnType)) {
      messages.push({
        location: command.location,
        text: i18n.translate('kbn-esql-ast.esql.validation.changePointUnsupportedFieldType', {
          defaultMessage:
            'CHANGE_POINT only supports numeric types values, found [{columnName}] of type [{valueColumnType}]',
          values: { columnName, valueColumnType },
        }),
        type: 'error',
        code: 'changePointUnsupportedFieldType',
      });
    }
  }

  // validate ON column
  const defaultOnColumnName = '@timestamp';
  const onColumn = command.args.find((arg) => isOptionNode(arg) && arg.name === 'on');
  const hasDefaultOnColumn = context?.fields.has(defaultOnColumnName);
  if (!onColumn && !hasDefaultOnColumn) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.changePointOnFieldMissing', {
        defaultMessage: '[CHANGE_POINT] Default {defaultOnColumnName} column is missing',
        values: { defaultOnColumnName },
      }),
      type: 'error',
      code: 'changePointOnFieldMissing',
    });
  }

  // validate AS
  const asArg = command.args.find((arg) => isOptionNode(arg) && arg.name === 'as');
  if (asArg && isOptionNode(asArg)) {
    // populate userDefinedColumns references to prevent the common check from failing with unknown column
    asArg.args.forEach((arg, index) => {
      if (isColumn(arg)) {
        context?.userDefinedColumns.set(arg.name, [
          { name: arg.name, location: arg.location, type: index === 0 ? 'keyword' : 'long' },
        ]);
      }
    });
  }

  messages.push(...validateCommandArguments(command, ast, context));

  return messages;
};
