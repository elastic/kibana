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
import { ExpressionFunction, Render } from '../../../../plugins/expressions/public';


export interface Arguments {
  visConfig: string;
}

export interface InputControlVisParams {
  visConfig: Arguments['visConfig'];
}

const name = 'input_control_vis';

type Context = undefined;

interface RenderValue {
  visType: 'input_control_vis';
  visConfig: InputControlVisParams;
}

type Return = Promise<Render<RenderValue>>;

export const createInputControlVisFn = (): ExpressionFunction<
  typeof name,
  Context,
  Arguments,
  Return
> => ({
  name,
  type: 'render',
  context: {
    types: [],
  },
  help: i18n.translate('inputControl.function.help', {
    defaultMessage: 'Input control visualization',
  }),
  args: {
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: i18n.translate('inputControl.function.visConfig.help', {
        defaultMessage: 'Viualization Config',
      }),
    },
  },
  async fn(context, args) {
    const params = JSON.parse(args.visConfig);
    return {
      type: 'render',
      as: 'visualization',
      value: {
        visType: 'input_control_vis',
        visConfig: params,
      },
    };
  },
});
