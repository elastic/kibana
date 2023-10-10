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
  switch (messageId) {
    case 'wrongArgumentType':
      return {
        message: i18n.translate('monaco.esql.validation.wrongArgumentType', {
          defaultMessage:
            'Argument of [{name}] must be [{argType}], found value [{value}] type [{givenType}]',
          values,
        }),
      };
    case 'unknownColumn':
      return {
        message: i18n.translate('monaco.esql.validation.wrongArgumentColumnType', {
          defaultMessage: 'Unknown column [{name}]',
          values,
        }),
      };
    case 'unknownIndex':
      return {
        message: i18n.translate('monaco.esql.validation.wrongArgumentColumnType', {
          defaultMessage: 'Unknown index [{name}]',
          values,
        }),
      };
    case 'unknownFunction':
      return {
        message: i18n.translate('monaco.esql.validation.missingFunction', {
          defaultMessage: 'Unknown function [{name}]',
          values,
        }),
      };
    case 'wrongArgumentNumber':
      return {
        message: i18n.translate('monaco.esql.validation.wrongArgumentNumber', {
          defaultMessage:
            'Error building [{fn}]: expects exactly {numArgs, plural, one {one argument} other {{numArgs} arguments}}, passed {passedArgs} instead.',
          values,
        }),
      };
    case 'noNestedArgumentSupport':
      return {
        message: i18n.translate('monaco.esql.validation.noNestedArgumentSupport', {
          defaultMessage:
            "Aggregate function's parameters must be an attribute or literal; found [{name}] of type [{argType}]",
          values,
        }),
      };
    case 'shadowFieldType':
      return {
        message: i18n.translate('monaco.esql.validation.typeOverwrite', {
          defaultMessage:
            'Column [{field}] of type {fieldType} has been overwritten as new type: {newType}',
          values,
        }),
        type: 'warning',
      };
    case 'unsupportedColumnTypeForCommand':
      return {
        message: i18n.translate('monaco.esql.validation.unsupportedColumnTypeForCommand', {
          defaultMessage:
            '{command} only supports {type} {typeCount, plural, one {type} other {types}} values, found [{column}] of type {givenType}',
          values,
        }),
      };
    case 'unknownOption':
      return {
        message: i18n.translate('monaco.esql.validation.unknownOption', {
          defaultMessage: 'Invalid option for {command}: [{option}]',
          values,
        }),
      };
    case 'unsupportedFunction':
      return {
        message: i18n.translate('monaco.esql.validation.unsupportedFunction', {
          defaultMessage: '{command} does not support function {name}',
          values,
        }),
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

export function createWarning(message: string, location: ESQLLocation) {
  return createMessage('warning', message, location);
}

export function createMessage(type: 'error' | 'warning', message: string, location: ESQLLocation) {
  return {
    type,
    text: message,
    location,
  };
}
