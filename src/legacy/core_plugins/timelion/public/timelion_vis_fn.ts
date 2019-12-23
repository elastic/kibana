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
import { ExpressionFunction, KibanaContext, Render } from 'src/plugins/expressions/public';
import { getTimelionRequestHandler } from './timelion_request_handler';
import { TimelionVisualizationDependencies } from './plugin';

const name = 'timelion_vis';
const TIMELION_VIS_NAME = 'timelion';

interface Arguments {
  expression: string;
  interval: any;
}

interface RenderValue {
  visData: Context;
  visType: 'timelion';
  visParams: VisParams;
}

type Context = KibanaContext | null;
type VisParams = Arguments;
type Return = Promise<Render<RenderValue>>;

export const getTimelionVisualizationConfig = (
  dependencies: TimelionVisualizationDependencies
): ExpressionFunction<typeof name, Context, Arguments, Return> => ({
  name,
  type: 'render',
  context: {
    types: ['kibana_context', 'null'],
  },
  help: i18n.translate('timelion.function.help', {
    defaultMessage: 'Timelion visualization',
  }),
  args: {
    expression: {
      types: ['string'],
      aliases: ['_'],
      default: '".es(*)"',
      help: '',
    },
    interval: {
      types: ['string', 'null'],
      default: 'auto',
      help: '',
    },
  },
  async fn(context, args) {
    const timelionRequestHandler = getTimelionRequestHandler(dependencies);

    const visParams = { expression: args.expression, interval: args.interval };

    const response = await timelionRequestHandler({
      timeRange: get(context, 'timeRange'),
      query: get(context, 'query'),
      filters: get(context, 'filters'),
      visParams,
      forceFetch: true,
    });

    response.visType = TIMELION_VIS_NAME;

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visParams,
        visType: TIMELION_VIS_NAME,
        visData: response,
      },
    };
  },
});
