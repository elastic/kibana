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
import { KibanaContext } from '../../data/public';
import { ExpressionFunctionDefinition, Render } from '../../expressions/public';

import { metricsRequestHandler } from './request_handler';

type Input = KibanaContext | null;
type Output = Promise<Render<TimeseriesRenderValue>>;

interface Arguments {
  params: string;
  uiState: string;
}

type VisParams = Required<Arguments>;

export interface TimeseriesRenderValue {
  visType: 'metrics';
  visData: Input;
  visConfig: VisParams;
  uiState: any;
}

export type TimeseriesExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'tsvb',
  Input,
  Arguments,
  Output
>;

export const createMetricsFn = (): TimeseriesExpressionFunctionDefinition => ({
  name: 'tsvb',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('visTypeTimeseries.function.help', {
    defaultMessage: 'TSVB visualization',
  }),
  args: {
    params: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
  },
  async fn(input, args) {
    const params = JSON.parse(args.params);
    const uiStateParams = JSON.parse(args.uiState);
    const { PersistedState } = await import('../../visualizations/public');
    const uiState = new PersistedState(uiStateParams);

    const response = await metricsRequestHandler({
      timeRange: get(input, 'timeRange', null),
      query: get(input, 'query', null),
      filters: get(input, 'filters', null),
      visParams: params,
      uiState,
    });

    response.visType = 'metrics';

    return {
      type: 'render',
      as: 'timeseries_vis',
      value: {
        uiState,
        visType: 'metrics',
        visConfig: params,
        visData: response,
      },
    };
  },
});
