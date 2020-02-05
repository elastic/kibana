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

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

import { ExpressionFunction, KibanaContext, Render } from '../../../../plugins/expressions/public';
import { VegaVisualizationDependencies } from './plugin';
import { createVegaRequestHandler } from './vega_request_handler';

const name = 'vega';
type Context = KibanaContext | null;

interface Arguments {
  spec: string;
}

export type VisParams = Required<Arguments>;

interface RenderValue {
  visData: Context;
  visType: typeof name;
  visConfig: VisParams;
}

type Return = Promise<Render<RenderValue>>;

export const createVegaFn = (
  dependencies: VegaVisualizationDependencies
): ExpressionFunction<typeof name, Context, Arguments, Return> => ({
  name,
  type: 'render',
  context: {
    types: ['kibana_context', 'null'],
  },
  help: i18n.translate('visTypeVega.function.help', {
    defaultMessage: 'Vega visualization',
  }),
  args: {
    spec: {
      types: ['string'],
      default: '',
      help: '',
    },
  },
  async fn(context, args) {
    const vegaRequestHandler = createVegaRequestHandler(dependencies);

    const response = await vegaRequestHandler({
      timeRange: get(context, 'timeRange'),
      query: get(context, 'query'),
      filters: get(context, 'filters'),
      visParams: { spec: args.spec },
    });

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: response,
        visType: name,
        visConfig: {
          spec: args.spec,
        },
      },
    };
  },
});
