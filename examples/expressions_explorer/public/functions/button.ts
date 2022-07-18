/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';

interface Arguments {
  color: string;
  href: string;
  name: string;
}

export type ExpressionFunctionButton = ExpressionFunctionDefinition<
  'button',
  unknown,
  Arguments,
  unknown
>;

export const buttonFn: ExpressionFunctionButton = {
  name: 'button',
  args: {
    color: {
      help: i18n.translate('expressions.functions.button.args.color', {
        defaultMessage: 'Color of the button',
      }),
    },
    href: {
      help: i18n.translate('expressions.functions.button.args.href', {
        defaultMessage: 'Link to which to navigate',
      }),
      types: ['string'],
      required: true,
    },
    name: {
      help: i18n.translate('expressions.functions.button.args.name', {
        defaultMessage: 'Name of the button',
      }),
      types: ['string'],
      default: 'button',
    },
  },
  help: 'Configures the button',
  fn: (input: unknown, args: Arguments) => {
    return {
      type: 'render',
      as: 'button',
      value: args,
    };
  },
};
