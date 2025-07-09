/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { isColumn } from '../../../ast/is';
import type { ESQLColumn, ESQLCommand, ESQLMessage } from '../../../types';

export const validate = (command: ESQLCommand): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const wildcardItems = command.args.filter((arg) => isColumn(arg) && arg.name === '*');
  if (wildcardItems.length) {
    messages.push(
      ...wildcardItems.map((column) => ({
        location: (column as ESQLColumn).location,
        text: i18n.translate('kbn-esql-ast.esql.validation.dropAllColumnsError', {
          defaultMessage: 'Removing all fields is not allowed [*]',
        }),
        type: 'error' as const,
        code: 'dropAllColumnsError',
      }))
    );
  }
  const droppingTimestamp = command.args.find((arg) => isColumn(arg) && arg.name === '@timestamp');
  if (droppingTimestamp) {
    messages.push({
      location: (droppingTimestamp as ESQLColumn).location,
      text: i18n.translate('kbn-esql-ast.esql.validation.dropTimestampWarning', {
        defaultMessage: 'Drop [@timestamp] will remove all time filters to the search results',
      }),
      type: 'warning',
      code: 'dropTimestampWarning',
    });
  }
  return messages;
};
