/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Serializable } from '@kbn/utility-types';
import { ExpressionFunctionDefinition } from '../types';

interface Arguments {
  name: string[];
  value?: Serializable[];
}

export type ExpressionFunctionVarSet = ExpressionFunctionDefinition<
  'var_set',
  unknown,
  Arguments,
  unknown
>;

export const variableSet: ExpressionFunctionVarSet = {
  name: 'var_set',
  help: i18n.translate('expressions.functions.varset.help', {
    defaultMessage: 'Updates the Kibana global context.',
  }),
  args: {
    name: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      multi: true,
      help: i18n.translate('expressions.functions.varset.name.help', {
        defaultMessage: 'Specify the name of the variable.',
      }),
    },
    value: {
      aliases: ['val'],
      multi: true,
      help: i18n.translate('expressions.functions.varset.val.help', {
        defaultMessage:
          'Specify the value for the variable. When unspecified, the input context is used.',
      }),
    },
  },
  fn(input, args, context) {
    const { variables } = context;
    args.name.forEach((name, i) => {
      variables[name] = args.value?.[i] === undefined ? input : args.value[i];
    });

    return input;
  },
};
