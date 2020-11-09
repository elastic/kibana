/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { ExpressionFunctionDefinition } from '../types';

interface Arguments {
  variable: string;
  default: string | number | boolean;
}

type Output = any;

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
