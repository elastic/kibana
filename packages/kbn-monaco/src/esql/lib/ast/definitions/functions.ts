/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isLiteralItem } from '../shared/helpers';
import { ESQLFunction } from '../types';
import { FunctionDefinition } from './types';

const validateLogFunctions = (fnDef: ESQLFunction) => {
  const messages = [];
  // do not really care here about the base and field
  // just need to check both values are not negative
  for (const arg of fnDef.args) {
    if (isLiteralItem(arg) && arg.value < 0) {
      messages.push({
        type: 'warning' as const,
        code: 'logOfNegativeValue',
        text: i18n.translate('monaco.esql.divide.warning.logOfNegativeValue', {
          defaultMessage: 'Log of a negative number results in null: {value}',
          values: {
            value: arg.value,
          },
        }),
        location: arg.location,
      });
    }
  }
  return messages;
};

import * as rawFunctionDefinitions from './eval_functions.json';

const evalFunctionDefinitions: FunctionDefinition[] = rawFunctionDefinitions
  .sort(({ name: a }, { name: b }) => a.localeCompare(b))
  .map((def) => ({
    ...def,
    supportedCommands: ['stats', 'eval', 'where', 'row'],
    supportedOptions: ['by'],
    type: 'eval',
  }));

export { evalFunctionDefinitions };
