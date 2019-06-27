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
import chrome from 'ui/chrome';
import { VisRequestHandlersRegistryProvider as RequestHandlersProvider } from 'ui/registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider as ResponseHandlerProvider } from 'ui/registry/vis_response_handlers';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { IndexPatternsProvider } from 'ui/index_patterns';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { PersistedState } from 'ui/persisted_state';

function getHandler(from, type) {
  if (typeof type === 'function') {
    return type;
  }
  if (type === 'courier' || type === 'none') {
    return null;
  }
  const handlerDesc = from.find(handler => handler.name === type);
  if (!handlerDesc) {
    throw new Error(`Could not find handler "${type}".`);
  }
  return handlerDesc.handler;
}

export const visualization = () => ({
  name: 'visualization',
  type: 'render',
  help: i18n.translate('interpreter.functions.visualization.help', {
    defaultMessage: 'A simple visualization'
  }),
  args: {
    index: {
      types: ['string', 'null'],
      default: null,
    },
    metricsAtAllLevels: {
      types: ['boolean'],
      default: false,
    },
    partialRows: {
      types: ['boolean'],
      default: false,
    },
    type: {
      types: ['string'],
      default: '',
    },
    schemas: {
      types: ['string'],
      default: '"{}"',
    },
    visConfig: {
      types: ['string'],
      default: '"{}"',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
    }
  },
  async fn(context, args, handlers) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private');
    const requestHandlers = Private(RequestHandlersProvider);
    const responseHandlers = Private(ResponseHandlerProvider);
    const visTypes = Private(VisTypesRegistryProvider);
    const indexPatterns = Private(IndexPatternsProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

    const visConfigParams = JSON.parse(args.visConfig);
    const schemas = JSON.parse(args.schemas);
    const visType = visTypes.byName[args.type || 'histogram'];
    const requestHandler = getHandler(requestHandlers, visType.requestHandler);
    const responseHandler = getHandler(responseHandlers, visType.responseHandler);
    const indexPattern = args.index ? await indexPatterns.get(args.index) : null;

    const uiStateParams = JSON.parse(args.uiState);
    const uiState = new PersistedState(uiStateParams);

    if (requestHandler) {
      context = await requestHandler({
        partialRows: args.partialRows,
        metricsAtAllLevels: args.metricsAtAllLevels,
        index: indexPattern,
        visParams: visConfigParams,
        timeRange: get(context, 'timeRange', null),
        query: get(context, 'query', null),
        filters: get(context, 'filters', null),
        uiState: uiState,
        inspectorAdapters: handlers.inspectorAdapters,
        queryFilter,
        forceFetch: true,
      });
    }

    if (responseHandler) {
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

      context = await responseHandler(context);
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: args.type,
        visConfig: visConfigParams
      }
    };
  }
});
