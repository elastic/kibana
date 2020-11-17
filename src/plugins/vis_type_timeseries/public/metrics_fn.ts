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
import { KibanaContext } from '../../data/public';
import { ExpressionFunctionDefinition, Render } from '../../expressions/public';

import { PanelSchema } from '../common/types';
import { metricsRequestHandler } from './request_handler';

type Input = KibanaContext | null;
type Output = Promise<Render<TimeseriesRenderValue>>;

interface Arguments {
  params: string;
  uiState: string;
}

export interface TimeseriesRenderValue {
  visType: 'metrics';
  visData: Input;
  visConfig: PanelSchema;
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
    const visParams: PanelSchema = JSON.parse(args.params);
    const uiState = JSON.parse(args.uiState);

    const response = await metricsRequestHandler({
      input,
      visParams,
      uiState,
    });

    response.visType = 'metrics';

    return {
      type: 'render',
      as: 'timeseries_vis',
      value: {
        uiState,
        visType: 'metrics',
        visConfig: visParams,
        visData: response,
      },
    };
  },
});
