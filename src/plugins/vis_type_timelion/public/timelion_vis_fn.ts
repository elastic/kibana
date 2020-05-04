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
import {
  ExpressionFunctionDefinition,
  KibanaContext,
  Render,
} from 'src/plugins/expressions/public';
import { getTimelionRequestHandler } from './helpers/timelion_request_handler';
import { TIMELION_VIS_NAME } from './timelion_vis_type';
import { TimelionVisDependencies } from './plugin';

type Input = KibanaContext | null;
type Output = Promise<Render<RenderValue>>;
interface Arguments {
  expression: string;
  interval: string;
}

interface RenderValue {
  visData: Input;
  visType: 'timelion';
  visParams: VisParams;
}

export type VisParams = Arguments;

export const getTimelionVisualizationConfig = (
  dependencies: TimelionVisDependencies
): ExpressionFunctionDefinition<'timelion_vis', Input, Arguments, Output> => ({
  name: 'timelion_vis',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
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
      types: ['string'],
      default: 'auto',
      help: '',
    },
  },
  async fn(input, args) {
    const timelionRequestHandler = getTimelionRequestHandler(dependencies);

    const visParams = { expression: args.expression, interval: args.interval };

    const response = await timelionRequestHandler({
      timeRange: get(input, 'timeRange'),
      query: get(input, 'query'),
      filters: get(input, 'filters'),
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
