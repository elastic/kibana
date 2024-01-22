/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ESQLLocation, ESQLMessage } from '../types';
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
        message: i18n.translate('monaco.esql.validation.wrongArgumentType', {
          defaultMessage:
            'Argument of [{name}] must be [{argType}], found value [{value}] type [{givenType}]',
          values: {
            name: out.name,
            argType: out.argType,
            value: out.value,
            givenType: out.givenType,
          },
        }),
      };
    case 'unknownColumn':
      return {
        message: i18n.translate('monaco.esql.validation.unknownColumn', {
          defaultMessage: 'Unknown column [{name}]',
          values: { name: out.name },
        }),
      };
    case 'unknownIndex':
      return {
        message: i18n.translate('monaco.esql.validation.unknownIndex', {
          defaultMessage: 'Unknown index [{name}]',
          values: { name: out.name },
        }),
      };
    case 'unknownFunction':
      return {
        message: i18n.translate('monaco.esql.validation.missingFunction', {
          defaultMessage: 'Unknown function [{name}]',
          values: { name: out.name },
        }),
      };
    case 'wrongArgumentNumber':
      return {
        message: i18n.translate('monaco.esql.validation.wrongArgumentNumber', {
          defaultMessage:
            'Error building [{fn}]: expects exactly {numArgs, plural, one {one argument} other {{numArgs} arguments}}, passed {passedArgs} instead.',
          values: { fn: out.fn, numArgs: out.numArgs, passedArgs: out.passedArgs },
        }),
      };
    case 'noNestedArgumentSupport':
      return {
        message: i18n.translate('monaco.esql.validation.noNestedArgumentSupport', {
          defaultMessage:
            "Aggregate function's parameters must be an attribute or literal; found [{name}] of type [{argType}]",
          values: { name: out.name, argType: out.argType },
        }),
      };
    case 'shadowFieldType':
      return {
        message: i18n.translate('monaco.esql.validation.typeOverwrite', {
          defaultMessage:
            'Column [{field}] of type {fieldType} has been overwritten as new type: {newType}',
          values: { field: out.field, fieldType: out.fieldType, newType: out.newType },
        }),
        type: 'warning',
      };
    case 'unsupportedColumnTypeForCommand':
      return {
        message: i18n.translate('monaco.esql.validation.unsupportedColumnTypeForCommand', {
          defaultMessage:
            '{command} only supports {type} {typeCount, plural, one {type} other {types}} values, found [{column}] of type {givenType}',
          values: {
            command: out.command,
            type: out.type,
            typeCount: out.typeCount,
            column: out.column,
            givenType: out.givenType,
          },
        }),
      };
    case 'unknownOption':
      return {
        message: i18n.translate('monaco.esql.validation.unknownOption', {
          defaultMessage: 'Invalid option for {command}: [{option}]',
          values: {
            command: out.command,
            option: out.option,
          },
        }),
      };
    case 'unsupportedFunction':
      return {
        message: i18n.translate('monaco.esql.validation.unsupportedFunction', {
          defaultMessage: '{command} does not support function {name}',
          values: {
            command: out.command,
            name: out.name,
          },
        }),
      };
    case 'unknownInterval':
      return {
        message: i18n.translate('monaco.esql.validation.unknownInterval', {
          defaultMessage: `Unexpected time interval qualifier: '{value}'`,
          values: {
            value: out.value,
          },
        }),
      };
    case 'unsupportedTypeForCommand':
      return {
        message: i18n.translate('monaco.esql.validation.unsupportedTypeForCommand', {
          defaultMessage: '{command} does not support [{type}] in expression [{value}]',
          values: {
            command: out.command,
            type: out.type,
            value: out.value,
          },
        }),
      };
    case 'unknownPolicy':
      return {
        message: i18n.translate('monaco.esql.validation.unknownPolicy', {
          defaultMessage: 'Unknown policy [{name}]',
          values: {
            name: out.name,
          },
        }),
      };
    case 'unknownAggregateFunction':
      return {
        message: i18n.translate('monaco.esql.validation.unknowAggregateFunction', {
          defaultMessage: '{command} expects an aggregate function, found [{value}]',
          values: {
            command: out.command,
            value: out.value,
          },
        }),
      };
    case 'wildcardNotSupportedForCommand':
      return {
        message: i18n.translate('monaco.esql.validation.wildcardNotSupportedForCommand', {
          defaultMessage: 'Using wildcards (*) in {command} is not allowed [{value}]',
          values: {
            command: out.command,
            value: out.value,
          },
        }),
      };
    case 'noWildcardSupportAsArg':
      return {
        message: i18n.translate('monaco.esql.validation.wildcardNotSupportedForFunction', {
          defaultMessage: 'Using wildcards (*) in {name} is not allowed',
          values: {
            name: out.name,
          },
        }),
      };
    case 'unsupportedFieldType':
      return {
        message: i18n.translate('monaco.esql.validation.unsupportedFieldType', {
          defaultMessage:
            'Field [{field}] cannot be retrieved, it is unsupported or not indexed; returning null',
          values: {
            field: out.field,
          },
        }),
        type: 'warning',
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
  return createMessage(type, message, locations);
}

export function createMessage(type: 'error' | 'warning', message: string, location: ESQLLocation) {
  return {
    type,
    text: message,
    location,
  };
}
