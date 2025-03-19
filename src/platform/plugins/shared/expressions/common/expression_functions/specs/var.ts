/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';

interface Arguments {
  name: string;
}

export type ExpressionFunctionVar = ExpressionFunctionDefinition<
  'var',
  unknown,
  Arguments,
  unknown
>;

export const variable: ExpressionFunctionVar = {
  name: 'var',
  help: i18n.translate('expressions.functions.var.help', {
    defaultMessage: 'Updates the Kibana global context.',
  }),
  args: {
    name: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      help: i18n.translate('expressions.functions.var.name.help', {
        defaultMessage: 'Specify the name of the variable.',
      }),
    },
  },
  fn(input, args, context) {
    const { variables } = context;

    return variables[args.name];
  },
};
