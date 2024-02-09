/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isColumnItem, isLiteralItem } from '../shared/helpers';
import { ESQLCommandOption, ESQLMessage } from '../types';
import { CommandOptionsDefinition } from './types';

export const byOption: CommandOptionsDefinition = {
  name: 'by',
  description: i18n.translate('monaco.esql.definitions.byDoc', {
    defaultMessage: 'By',
  }),
  signature: {
    multipleParams: true,
    params: [{ name: 'expression', type: 'any' }],
  },
  optional: true,
};

export const metadataOption: CommandOptionsDefinition = {
  name: 'metadata',
  description: i18n.translate('monaco.esql.definitions.metadataDoc', {
    defaultMessage: 'Metadata',
  }),
  signature: {
    multipleParams: true,
    params: [{ name: 'column', type: 'column' }],
  },
  optional: true,
  wrapped: ['[', ']'],
  skipCommonValidation: true,
  validate: (option, command, references) => {
    const messages: ESQLMessage[] = [];
    const fields = option.args.filter(isColumnItem);
    const metadataFieldsAvailable = references as unknown as Set<string>;
    if (metadataFieldsAvailable.size > 0) {
      for (const field of fields) {
        if (!metadataFieldsAvailable.has(field.name)) {
          messages.push({
            location: field.location,
            text: i18n.translate('monaco.esql.validation.wrongMetadataArgumentType', {
              defaultMessage:
                'Metadata field [{value}] is not available. Available metadata fields are: [{availableFields}]',
              values: {
                value: field.name,
                availableFields: Array.from(metadataFieldsAvailable).join(', '),
              },
            }),
            type: 'error',
            code: 'unknownMetadataField',
          });
        }
      }
    }
    return messages;
  },
};

export const asOption: CommandOptionsDefinition = {
  name: 'as',
  description: i18n.translate('monaco.esql.definitions.asDoc', { defaultMessage: 'As' }),
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
  description: i18n.translate('monaco.esql.definitions.onDoc', { defaultMessage: 'On' }),
  signature: {
    multipleParams: false,
    params: [{ name: 'matchingColumn', type: 'column' }],
  },
  optional: true,
};

export const withOption: CommandOptionsDefinition = {
  name: 'with',
  description: i18n.translate('monaco.esql.definitions.withDoc', { defaultMessage: 'With' }),
  signature: {
    multipleParams: true,
    params: [{ name: 'assignment', type: 'any' }],
  },
  optional: true,
};

export const appendSeparatorOption: CommandOptionsDefinition = {
  name: 'append_separator',
  description: i18n.translate('monaco.esql.definitions.appendSeparatorDoc', {
    defaultMessage:
      'The character(s) that separate the appended fields. Default to empty string ("").',
  }),
  signature: {
    multipleParams: false,
    params: [{ name: 'separator', type: 'string' }],
  },
  optional: true,
  skipCommonValidation: true, // tell the validation engine to use only the validate function here
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
            'Invalid value for DISSECT append_separator: expected a string, but was [{value}]',
          values: {
            value,
          },
        }),
        type: 'error',
        code: 'wrongDissectOptionArgumentType',
      });
    }
    return messages;
  },
};
