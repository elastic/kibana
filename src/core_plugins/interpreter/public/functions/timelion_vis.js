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

import _ from 'lodash';

import { TimelionRequestHandlerProvider } from '../../../timelion/public/vis/timelion_request_handler';


import chrome from 'ui/chrome';


export default () => ({
  name: 'timelion_vis',
  type: 'render',
  context: {
    types: [
      'kibana_context',
      'null',
    ],
  },
  help: 'Run tsvb request.',
  args: {
    expression: {
      types: ['string'],
      default: '".es(*)"',
      help: 'timelion expression definition',
      multi: false,
    },
    interval: {
      types: ['string', 'null'],
      default: 'auto',
      help: 'timelion interval',
      multi: false,
    }
  },
  fn(context, args) {
    return chrome.dangerouslyGetActiveInjector().then(async $injector => {
      const Private = $injector.get('Private');
      const timelionRequestHandler = Private(TimelionRequestHandlerProvider).handler;

      const response = await timelionRequestHandler({
        timeRange: _.get(context, 'timeRange', null),
        query: _.get(context, 'query', null),
        filters: _.get(context, 'filters', null),
        forceFetch: true,
        visParams: { expression: args.expression, interval: args.interval }
      });

      return {
        type: 'render',
        as: 'visualization',
        value: response,
      };

    });
  },
});
