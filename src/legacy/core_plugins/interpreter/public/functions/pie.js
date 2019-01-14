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

import { VislibSlicesResponseHandlerProvider } from 'ui/vis/response_handlers/vislib';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';

export const kibanaPie = () => ({
  name: 'kibana_pie',
  type: 'render',
  context: {
    types: [
      'kibana_table', 'null'
    ],
  },
  help: i18n.translate('common.core_plugins.interpreter.public.functions.pie.help', {
    defaultMessage: 'Pie visualization'
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  async fn(context, args) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private');
    const responseHandler = Private(VislibSlicesResponseHandlerProvider).handler;
    const visConfigParams = JSON.parse(args.visConfig);

    const convertedData = await responseHandler(context, visConfigParams.dimensions);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visConfig: {
          type: args.type,
          params: visConfigParams,
        },
        params: {
          listenOnChange: true,
        }
      },
    };
  },
});
