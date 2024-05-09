/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ESQLLocation, ESQLMessage } from '@kbn/esql-ast';
import type { ErrorTypes, ErrorValues } from './types';

function getMessageAndTypeFromId<K extends ErrorTypes>({
  messageId,
  values,
}: {
  messageId: K;
  values: ErrorValues<K>;
}): { message: string; type?: 'error' | 'warning' } {
  // Use a less strict type instead of doing a typecast on each message type
  const out = values as unknown as Record<string, string>;
  // i18n validation wants to the values prop to be declared inline, so need to unpack and redeclare again all props
  switch (messageId) {
    case 'wrongArgumentType':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wrongArgumentType',
          {
            defaultMessage:
              'Argument of [{name}] must be [{argType}], found value [{value}] type [{givenType}]',
            values: {
              name: out.name,
              argType: out.argType,
              value: out.value,
              givenType: out.givenType,
            },
          }
        ),
      };
    case 'unknownColumn':
      return {
        message: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.unknownColumn', {
          defaultMessage: 'Unknown column [{name}]',
          values: { name: out.name },
        }),
      };
    case 'unknownIndex':
      return {
        message: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.unknownIndex', {
          defaultMessage: 'Unknown index [{name}]',
          values: { name: out.name },
        }),
      };
    case 'unknownFunction':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.missingFunction',
          {
            defaultMessage: 'Unknown function [{name}]',
            values: { name: out.name },
          }
        ),
      };
    case 'wrongArgumentNumber':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wrongArgumentExactNumber',
          {
            defaultMessage:
              'Error: [{fn}] function expects exactly {numArgs, plural, one {one argument} other {{numArgs} arguments}}, got {passedArgs}.',
            values: {
              fn: out.fn,
              numArgs: out.numArgs,
              passedArgs: out.passedArgs,
            },
          }
        ),
      };
    case 'wrongArgumentNumberTooMany':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wrongArgumentTooManyNumber',
          {
            defaultMessage:
              'Error: [{fn}] function expects {extraArgs, plural, =0 {} other {no more than }}{numArgs, plural, one {one argument} other {{numArgs} arguments}}, got {passedArgs}.',
            values: {
              fn: out.fn,
              numArgs: out.numArgs,
              passedArgs: out.passedArgs,
              extraArgs: out.extraArgs,
            },
          }
        ),
      };
    case 'wrongArgumentNumberTooFew':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wrongArgumentTooFewNumber',
          {
            defaultMessage:
              'Error: [{fn}] function expects {missingArgs, plural, =0 {} other {at least }}{numArgs, plural, one {one argument} other {{numArgs} arguments}}, got {passedArgs}.',
            values: {
              fn: out.fn,
              numArgs: out.numArgs,
              passedArgs: out.passedArgs,
              missingArgs: out.missingArgs,
            },
          }
        ),
      };
    case 'noNestedArgumentSupport':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.noNestedArgumentSupport',
          {
            defaultMessage:
              "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [{name}] of type [{argType}]",
            values: { name: out.name, argType: out.argType },
          }
        ),
      };
    case 'shadowFieldType':
      return {
        message: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.typeOverwrite', {
          defaultMessage:
            'Column [{field}] of type {fieldType} has been overwritten as new type: {newType}',
          values: { field: out.field, fieldType: out.fieldType, newType: out.newType },
        }),
        type: 'warning',
      };
    case 'unsupportedColumnTypeForCommand':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedColumnTypeForCommand',
          {
            defaultMessage:
              '{command} only supports {type} {typeCount, plural, one {type} other {types}} values, found [{column}] of type [{givenType}]',
            values: {
              command: out.command,
              type: out.type,
              typeCount: out.typeCount,
              column: out.column,
              givenType: out.givenType,
            },
          }
        ),
      };
    case 'unknownOption':
      return {
        message: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.unknownOption', {
          defaultMessage: 'Invalid option for {command}: [{option}]',
          values: {
            command: out.command,
            option: out.option,
          },
        }),
      };
    case 'unsupportedFunctionForCommand':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedFunctionForCommand',
          {
            defaultMessage: '{command} does not support function {name}',
            values: {
              command: out.command,
              name: out.name,
            },
          }
        ),
      };
    case 'unsupportedFunctionForCommandOption':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedFunctionforCommandOption',
          {
            defaultMessage: '{command} {option} does not support function {name}',
            values: {
              command: out.command,
              option: out.option,
              name: out.name,
            },
          }
        ),
      };
    case 'unknownInterval':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unknownInterval',
          {
            defaultMessage: `Unexpected time interval qualifier: '{value}'`,
            values: {
              value: out.value,
            },
          }
        ),
      };
    case 'unsupportedTypeForCommand':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedTypeForCommand',
          {
            defaultMessage: '{command} does not support [{type}] in expression [{value}]',
            values: {
              command: out.command,
              type: out.type,
              value: out.value,
            },
          }
        ),
      };
    case 'unknownPolicy':
      return {
        message: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.unknownPolicy', {
          defaultMessage: 'Unknown policy [{name}]',
          values: {
            name: out.name,
          },
        }),
      };
    case 'unknownAggregateFunction':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unknowAggregateFunction',
          {
            defaultMessage:
              'Expected an aggregate function or group but got [{value}] of type [{type}]',
            values: {
              type: out.type,
              value: out.value,
            },
          }
        ),
      };
    case 'wildcardNotSupportedForCommand':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wildcardNotSupportedForCommand',
          {
            defaultMessage: 'Using wildcards (*) in {command} is not allowed [{value}]',
            values: {
              command: out.command,
              value: out.value,
            },
          }
        ),
      };
    case 'noWildcardSupportAsArg':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wildcardNotSupportedForFunction',
          {
            defaultMessage: 'Using wildcards (*) in {name} is not allowed',
            values: {
              name: out.name,
            },
          }
        ),
      };
    case 'unsupportedFieldType':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedFieldType',
          {
            defaultMessage:
              'Field [{field}] cannot be retrieved, it is unsupported or not indexed; returning null',
            values: {
              field: out.field,
            },
          }
        ),
        type: 'warning',
      };
    case 'unsupportedSetting':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedSetting',
          {
            defaultMessage: 'Unsupported setting [{setting}], expected [{expected}]',
            values: {
              setting: out.setting,
              expected: out.expected,
            },
          }
        ),
        type: 'error',
      };
    case 'unsupportedSettingCommandValue':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedSettingValue',
          {
            defaultMessage:
              'Unrecognized value [{value}] for {command}, mode needs to be one of [{expected}]',
            values: {
              expected: out.expected,
              value: out.value,
              command: out.command,
            },
          }
        ),
        type: 'error',
      };
    case 'unsupportedLiteralOption':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.unsupportedLiteralOption',
          {
            defaultMessage:
              'Invalid option [{value}] for {name}. Supported options: [{supportedOptions}].',
            values: {
              name: out.name,
              value: out.value,
              supportedOptions: out.supportedOptions,
            },
          }
        ),
        type: 'warning',
      };
    case 'expectedConstant':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.expectedConstantValue',
          {
            defaultMessage: 'Argument of [{fn}] must be a constant, received [{given}]',
            values: {
              given: out.given,
              fn: out.fn,
            },
          }
        ),
        type: 'error',
      };
    case 'metadataBracketsDeprecation':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.metadataBracketsDeprecation',
          {
            defaultMessage:
              "Square brackets '[]' need to be removed from FROM METADATA declaration",
          }
        ),
        type: 'warning',
      };
    case 'unknownMetadataField':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wrongMetadataArgumentType',
          {
            defaultMessage:
              'Metadata field [{value}] is not available. Available metadata fields are: [{availableFields}]',
            values: {
              value: out.value,
              availableFields: out.availableFields,
            },
          }
        ),
        type: 'error',
      };
    case 'wrongDissectOptionArgumentType':
      return {
        message: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.validation.wrongDissectOptionArgumentType',
          {
            defaultMessage:
              'Invalid value for DISSECT append_separator: expected a string, but was [{value}]',
            values: {
              value: out.value,
            },
          }
        ),
        type: 'error',
      };
  }
  return { message: '' };
}

export function getMessageFromId<K extends ErrorTypes>({
  locations,
  ...payload
}: {
  messageId: K;
  values: ErrorValues<K>;
  locations: ESQLLocation;
}): ESQLMessage {
  const { message, type = 'error' } = getMessageAndTypeFromId(payload);
  return createMessage(type, message, locations, payload.messageId);
}

export function createMessage(
  type: 'error' | 'warning',
  message: string,
  location: ESQLLocation,
  messageId: string
) {
  return {
    type,
    text: message,
    location,
    code: messageId,
  };
}

export function getUnknownTypeLabel() {
  return i18n.translate('kbn-esql-validation-autocomplete.esql.validation.unknownColumnType', {
    defaultMessage: 'Unknown type',
  });
}
