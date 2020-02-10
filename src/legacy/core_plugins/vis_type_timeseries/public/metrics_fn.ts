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
} from '../../../../plugins/expressions/public';

// @ts-ignore
import { metricsRequestHandler } from './request_handler';
import { PersistedState } from './legacy_imports';

type Input = KibanaContext | null;
type Output = Promise<Render<RenderValue>>;

interface Arguments {
  params: string;
  uiState: string;
  savedObjectId: string | null;
}

type VisParams = Required<Arguments>;

interface RenderValue {
  visType: 'metrics';
  visData: Input;
  visConfig: VisParams;
  uiState: any;
}

export const createMetricsFn = (): ExpressionFunctionDefinition<
  'tsvb',
  Input,
  Arguments,
  Output
> => ({
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
    savedObjectId: {
      types: ['null', 'string'],
      default: null,
      help: '',
    },
  },
  async fn(input, args) {
    const params = JSON.parse(args.params);
    const uiStateParams = JSON.parse(args.uiState);
    const savedObjectId = args.savedObjectId;
    const uiState = new PersistedState(uiStateParams);

    const response = await metricsRequestHandler({
      timeRange: get(input, 'timeRange', null),
      query: get(input, 'query', null),
      filters: get(input, 'filters', null),
      visParams: params,
      uiState,
      savedObjectId,
    });

    response.visType = 'metrics';

    return {
      type: 'render',
      as: 'visualization',
      value: {
        uiState,
        visType: 'metrics',
        visConfig: params,
        visData: response,
      },
    };
  },
});
