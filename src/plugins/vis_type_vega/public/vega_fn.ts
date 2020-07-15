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
import { ExpressionFunctionDefinition, KibanaContext, Render } from '../../expressions/public';
import { VegaVisualizationDependencies } from './plugin';
import { createVegaRequestHandler } from './vega_request_handler';
import { TimeRange, Query } from '../../data/public';

type Input = KibanaContext | null;
type Output = Promise<Render<RenderValue>>;

interface Arguments {
  spec: string;
}

export type VisParams = Required<Arguments>;

interface RenderValue {
  visData: Input;
  visType: 'vega';
  visConfig: VisParams;
}

export const createVegaFn = (
  dependencies: VegaVisualizationDependencies
): ExpressionFunctionDefinition<'vega', Input, Arguments, Output> => ({
  name: 'vega',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
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
  async fn(input, args, context) {
    const vegaRequestHandler = createVegaRequestHandler(dependencies, context.abortSignal);

    const response = await vegaRequestHandler({
      timeRange: get(input, 'timeRange') as TimeRange,
      query: get(input, 'query') as Query,
      filters: get(input, 'filters') as any,
      visParams: { spec: args.spec },
    });

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: response,
        visType: 'vega',
        visConfig: {
          spec: args.spec,
        },
      },
    };
  },
});
