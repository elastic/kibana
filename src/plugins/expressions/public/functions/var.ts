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
import { ExpressionFunction } from '../../common/types';

interface Arguments {
  name: string;
}

type Context = any;
type ExpressionFunctionVar = ExpressionFunction<'var', Context, Arguments, any>;

export const variable = (): ExpressionFunctionVar => ({
  name: 'var',
  help: i18n.translate('expressions.functions.var.help', {
    defaultMessage: 'Updates kibana global context',
  }),
  args: {
    name: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      help: i18n.translate('expressions.functions.var.name.help', {
        defaultMessage: 'Specify name of the variable',
      }),
    },
  },
  fn(context, args, handlers) {
    const variables: Record<string, any> = handlers.variables;
    return variables[args.name];
  },
});
