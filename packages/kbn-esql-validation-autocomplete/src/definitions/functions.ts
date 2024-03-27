/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import type { RecursivePartial } from '@kbn/utility-types';
import type { ESQLFunction } from '@kbn/esql-ast';
import { isLiteralItem } from '../shared/helpers';
import type { FunctionDefinition } from './types';

const validateLogFunctions = (fnDef: ESQLFunction) => {
  const messages = [];
  // do not really care here about the base and field
  // just need to check both values are not negative
  for (const arg of fnDef.args) {
    if (isLiteralItem(arg) && arg.value < 0) {
      messages.push({
        type: 'warning' as const,
        code: 'logOfNegativeValue',
        text: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.divide.warning.logOfNegativeValue',
          {
            defaultMessage: 'Log of a negative number results in null: {value}',
            values: {
              value: arg.value,
            },
          }
        ),
        location: arg.location,
      });
    }
  }
  return messages;
};

import * as rawFunctionDefinitions from './eval_functions.json';

/**
 * Overrides for function definitions
 *
 * This is the place to put information that is not reported by the `show functions` command
 * and, hence, won't be present in the JSON file.
 */
const functionOverrides: Record<string, RecursivePartial<FunctionDefinition>> = {
  log10: {
    validate: validateLogFunctions,
  },
  log: {
    validate: validateLogFunctions,
  },
  date_extract: {
    signatures: [
      {
        // override the first param as type chrono_literal
        params: [{ type: 'chrono_literal' }],
      },
    ],
  },
  date_trunc: {
    signatures: [
      {
        // override the first param to be of type time_literal
        params: [{ type: 'time_literal' }],
      },
    ],
  },
  auto_bucket: {
    signatures: new Array(18).fill({
      params: [{}, {}, { literalOnly: true }, { literalOnly: true }],
    }),
  },
};

const usedOverrides = new Set<string>();

rawFunctionDefinitions.forEach((def) => {
  if (functionOverrides[def.name]) {
    usedOverrides.add(def.name);
    _.merge(def, functionOverrides[def.name]);
  }
});

if (usedOverrides.size !== Object.keys(functionOverrides).length) {
  const unusedOverrides = Object.keys(functionOverrides).filter((name) => !usedOverrides.has(name));
  throw new Error(`Unused function overrides: ${unusedOverrides.join(', ')}`);
}

if (
  rawFunctionDefinitions.some(
    (def) => !def.signatures.some((sig) => sig.params.some((p) => !p.name))
  )
) {
  throw new Error(
    'Some function signatures have unnamed parameters... make sure the overrides match up with the JSON definitions.'
  );
}

const evalFunctionDefinitions: FunctionDefinition[] = rawFunctionDefinitions
  .sort(({ name: a }, { name: b }) => a.localeCompare(b))
  .map((def) => ({
    ...def,
    supportedCommands: ['stats', 'eval', 'where', 'row'],
    supportedOptions: ['by'],
    type: 'eval',
  }));

export { evalFunctionDefinitions };
