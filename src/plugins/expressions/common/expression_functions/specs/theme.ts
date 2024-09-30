/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { ExpressionFunctionDefinition } from '../types';

interface Arguments {
  variable: string;
  default?: string | number | boolean;
}

type Output = unknown;

export type ExpressionFunctionTheme = ExpressionFunctionDefinition<
  'theme',
  null,
  Arguments,
  Output
>;

export const theme: ExpressionFunctionTheme = {
  name: 'theme',
  aliases: [],
  help: i18n.translate('expressions.functions.themeHelpText', {
    defaultMessage: 'Reads a theme setting.',
  }),
  inputTypes: ['null'],
  args: {
    variable: {
      aliases: ['_'],
      help: i18n.translate('expressions.functions.theme.args.variableHelpText', {
        defaultMessage: 'Name of the theme variable to read.',
      }),
      required: true,
      types: ['string'],
    },
    default: {
      help: i18n.translate('expressions.functions.theme.args.defaultHelpText', {
        defaultMessage: 'default value in case theming info is not available.',
      }),
    },
  },
  fn: (input, args, handlers) => {
    // currently we use variable `theme`, but external theme service would be preferable
    const vars = handlers.variables.theme || {};
    return get(vars, args.variable, args.default);
  },
};
