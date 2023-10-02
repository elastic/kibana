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

export function getMessageFromId<K extends ErrorTypes>({
  messageId,
  values,
  locations,
}: {
  messageId: K;
  values: ErrorValues<K>;
  locations: ESQLLocation;
}): ESQLMessage {
  let message: string = '';
  // Use a less strict type instead of doing a typecast on each message type
  //   const out = values as unknown as Record<string, string>;
  switch (messageId) {
    case 'wrongArgumentType':
      message = i18n.translate('monaco.esql.validation.wrongArgumentType', {
        defaultMessage:
          'argument of [{name}] must be [{argType}], found value [{value}] type [{givenType}]',
        values,
      });
      break;
    case 'unknownColumn':
      message = i18n.translate('monaco.esql.validation.wrongArgumentColumnType', {
        defaultMessage: 'unknown column [{value}]',
        values,
      });
      break;
    case 'unknownFunction':
      message = i18n.translate('monaco.esql.validation.missingFunction', {
        defaultMessage: 'Unknown function [{name}]',
        values,
      });
      break;
    case 'wrongArgumentNumber':
      message = i18n.translate('monaco.esql.validation.wrongArgumentNumber', {
        defaultMessage:
          'error building [{fn}]: expects exactly {numArgs, plural, one {one argument} other {{numArgs} arguments}}, passed {passedArgs} instead.',
        values,
      });
      break;
    case 'noNestedArgumentSupport':
      message = i18n.translate('monaco.esql.validation.noNestedArgumentSupport', {
        defaultMessage:
          "aggregate function's parameters must be an attribute or literal; found [{name}] of type [{argType}]",
        values,
      });
      break;
  }
  return createMessage('error', message, locations);
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
