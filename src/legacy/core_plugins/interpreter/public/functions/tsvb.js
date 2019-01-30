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
import { MetricsRequestHandlerProvider } from 'plugins/metrics/kbn_vis_types/request_handler';
import { PersistedState } from 'ui/persisted_state';

import chrome from 'ui/chrome';


export const tsvb = () => ({
  name: 'tsvb',
  type: 'render',
  context: {
    types: [
      'kibana_context',
      'null',
    ],
  },
  help: i18n.translate('interpreter.functions.tsvb.help', {
    defaultMessage: 'TSVB visualization'
  }),
  args: {
    params: {
      types: ['string'],
      default: '"{}"',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
    }
  },
  async fn(context, args) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private');
    const metricsRequestHandler = Private(MetricsRequestHandlerProvider).handler;

    const params = JSON.parse(args.params);
    const uiStateParams = JSON.parse(args.uiState);
    const uiState = new PersistedState(uiStateParams);

    const response = await metricsRequestHandler({
      timeRange: get(context, 'timeRange', null),
      query: get(context, 'query', null),
      filters: get(context, 'filters', null),
      visParams: params,
      uiState: uiState,
    });

    response.visType = 'metrics';

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visType: 'metrics',
        visConfig: params,
        uiState: uiState,
        visData: response,
      },
    };
  },
});
