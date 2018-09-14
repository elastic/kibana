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

import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import chrome from 'ui/chrome';

export default () => ({
  name: 'visualization',
  type: 'render',
  context: {
    types: [
      'kibana_table', 'null'
    ],
  },
  help: 'A simple visualization.',
  args: {
    type: {
      types: ['string'],
      default: 'metric',
      help: 'visualization type',
      multi: false,
    },
    schemas: {
      types: ['string'],
      default: '"{}"',
      help: 'schemas configuration object',
      multi: false,
    },
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
      help: 'config of the visualization',
      multi: false,
    },
  },
  fn(context, args) {
    return chrome.dangerouslyGetActiveInjector().then(async $injector => {
      const Private = $injector.get('Private');
      const responseHandlers = Private(VisResponseHandlersRegistryProvider);
      const visTypes = Private(VisTypesRegistryProvider);
      const visConfigParams = JSON.parse(args.visConfig || {});
      const schemas = JSON.parse(args.schemas);
      const visType = visTypes.byName[args.type || 'table'];

      const getResponseHandler = (responseHandler) => {
        if (typeof responseHandler === 'function') {
          return responseHandler;
        }
        const searchResult = responseHandlers.find(handler => handler.name === visType.responseHandler);
        if (!searchResult) {
          return;
        }
        return searchResult.handler;
      };

      if (context.columns) {
        // assign schemas to aggConfigs
        context.columns.forEach(column => {
          column.aggConfig.aggConfigs.schemas = visType.schemas.all;
        });

        Object.keys(schemas).forEach(key => {
          schemas[key].forEach(i => {
            context.columns[i].aggConfig.schema = key;
          });
        });
      }

      const responseHandler = getResponseHandler(visType.responseHandler);
      const convertedData = responseHandler ? await responseHandler(context) : context;

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
    });
  },
});
