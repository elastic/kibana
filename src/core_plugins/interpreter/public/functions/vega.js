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

import chrome from 'ui/chrome';

import { VegaRequestHandlerProvider } from '../../../vega/public/vega_request_handler';
import _ from 'lodash';

export default () => ({
  name: 'vega',
  type: 'render',
  context: {
    types: [],
  },
  help: 'A vega visualization.',
  args: {
    spec: {
      types: ['string'],
      default: '{}',
      help: 'config of the visualization',
      multi: false,
    },
  },
  fn(context, args) {
    return chrome.dangerouslyGetActiveInjector().then(async $injector => {
      const Private = $injector.get('Private');
      const vegaRequestHandler = Private(VegaRequestHandlerProvider).handler;

      const response = await vegaRequestHandler({
        timeRange: _.get(context, 'timeRange', null),
        query: _.get(context, 'q', null),
        filters: _.get(context, 'filters', null),
        visParams: { spec: args.spec },
        forceFetch: true
      });

      return {
        type: 'render',
        as: 'visualization',
        value: {
          visData: response,
          visConfig: {
            type: 'vega',
            params: {
              spec: args.spec
            }
          },
        }
      };
    });
  }
});
