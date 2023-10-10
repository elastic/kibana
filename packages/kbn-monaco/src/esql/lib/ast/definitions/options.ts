/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isLiteralItem } from '../helpers';
import { ESQLCommandOption, ESQLMessage } from '../types';
import { CommandOptionsDefinition } from './types';

export const byOption: CommandOptionsDefinition = {
  name: 'by',
  description: i18n.translate('monaco.esql.autocomplete.byDoc', {
    defaultMessage: 'By',
  }),
  signature: {
    multipleParams: true,
    params: [{ name: 'column', type: 'column' }],
  },
  optional: true,
};

export const metadataOption: CommandOptionsDefinition = {
  name: 'metadata',
  description: i18n.translate('monaco.esql.autocomplete.metadataDoc', {
    defaultMessage: 'Metadata',
  }),
  signature: {
    multipleParams: true,
    params: [{ name: 'column', type: 'column' }],
  },
  optional: true,
  wrapped: ['[', ']'],
};

export const asOption: CommandOptionsDefinition = {
  name: 'as',
  description: i18n.translate('monaco.esql.autocomplete.asDoc', { defaultMessage: 'As' }),
  signature: {
    multipleParams: false,
    params: [
      { name: 'oldName', type: 'column' },
      { name: 'newName', type: 'column' },
    ],
  },
  optional: false,
};

export const onOption: CommandOptionsDefinition = {
  name: 'on',
  description: i18n.translate('monaco.esql.autocomplete.onDoc', { defaultMessage: 'On' }),
  signature: {
    multipleParams: false,
    params: [{ name: 'matchingColumn', type: 'column' }],
  },
  optional: false,
};

export const withOption: CommandOptionsDefinition = {
  name: 'with',
  description: i18n.translate('monaco.esql.autocomplete.withDoc', { defaultMessage: 'With' }),
  signature: {
    multipleParams: true,
    params: [
      { name: 'newColumn', type: 'column' },
      { name: 'enrichedField', type: 'column' },
    ],
  },
  optional: true,
};

export const appendSeparatorOption: CommandOptionsDefinition = {
  name: 'append_separator',
  description: i18n.translate('monaco.esql.autocomplete.appendSeparatorDoc', {
    defaultMessage:
      'The character(s) that separate the appended fields. Default to empty string ("").',
  }),
  signature: {
    multipleParams: false,
    params: [{ name: 'separator', type: 'string' }],
  },
  optional: true,
  validate: (option: ESQLCommandOption) => {
    const messages: ESQLMessage[] = [];
    const [firstArg] = option.args;
    if (
      !Array.isArray(firstArg) &&
      (!isLiteralItem(firstArg) || firstArg.literalType !== 'string')
    ) {
      const value = 'value' in firstArg ? firstArg.value : firstArg.name;
      messages.push({
        location: firstArg.location,
        text: i18n.translate('monaco.esql.validation.wrongDissectOptionArgumentType', {
          defaultMessage:
            'Invalid value for dissect append_separator: expected a string, but was [{value}]',
          values: {
            value,
          },
        }),
        type: 'error',
      });
    }
    return messages;
  },
};

export function getCommandOption(name: CommandOptionsDefinition['name']) {
  switch (name) {
    case 'by':
      return byOption;
    case 'metadata':
      return metadataOption;
    case 'as':
      return asOption;
    case 'on':
      return onOption;
    case 'with':
      return withOption;
    default:
      return;
  }
}
