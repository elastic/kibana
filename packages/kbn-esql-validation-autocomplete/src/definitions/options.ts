/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ESQLCommandOption, ESQLMessage } from '@kbn/esql-ast';
import { isColumnItem, isLiteralItem } from '../shared/helpers';
import { getMessageFromId } from '../validation/errors';
import type { CommandOptionsDefinition } from './types';

export const byOption: CommandOptionsDefinition = {
  name: 'by',
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.byDoc', {
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
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.metadataDoc', {
    defaultMessage: 'Metadata',
  }),
  signature: {
    multipleParams: true,
    params: [{ name: 'column', type: 'column' }],
  },
  optional: true,
  skipCommonValidation: true,
  validate: (option, command, references) => {
    const messages: ESQLMessage[] = [];
    // need to test the parent command here
    if (/\[metadata/i.test(command.text)) {
      messages.push(
        getMessageFromId({
          messageId: 'metadataBracketsDeprecation',
          values: {},
          locations: option.location,
        })
      );
    }
    const fields = option.args.filter(isColumnItem);
    const metadataFieldsAvailable = references as unknown as Set<string>;
    if (metadataFieldsAvailable.size > 0) {
      for (const field of fields) {
        if (!metadataFieldsAvailable.has(field.name)) {
          messages.push(
            getMessageFromId({
              messageId: 'unknownMetadataField',
              values: {
                value: field.name,
                availableFields: Array.from(metadataFieldsAvailable).join(', '),
              },
              locations: field.location,
            })
          );
        }
      }
    }
    return messages;
  },
};

export const asOption: CommandOptionsDefinition = {
  name: 'as',
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.asDoc', {
    defaultMessage: 'As',
  }),
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
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.onDoc', {
    defaultMessage: 'On',
  }),
  signature: {
    multipleParams: false,
    params: [{ name: 'matchingColumn', type: 'column' }],
  },
  optional: true,
};

export const withOption: CommandOptionsDefinition = {
  name: 'with',
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.withDoc', {
    defaultMessage: 'With',
  }),
  signature: {
    multipleParams: true,
    params: [{ name: 'assignment', type: 'any' }],
  },
  optional: true,
};

export const appendSeparatorOption: CommandOptionsDefinition = {
  name: 'append_separator',
  description: i18n.translate(
    'kbn-esql-validation-autocomplete.esql.definitions.appendSeparatorDoc',
    {
      defaultMessage:
        'The character(s) that separate the appended fields. Default to empty string ("").',
    }
  ),
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
      messages.push(
        getMessageFromId({
          messageId: 'wrongDissectOptionArgumentType',
          values: { value },
          locations: firstArg.location,
        })
      );
    }
    return messages;
  },
};
