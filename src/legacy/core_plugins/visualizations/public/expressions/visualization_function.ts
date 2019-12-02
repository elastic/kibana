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
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { PersistedState } from 'ui/persisted_state';
import { VisResponseValue } from 'src/plugins/visualizations/public';
import { ExpressionFunction, Render } from 'src/plugins/expressions/public';
import { getTypes, getIndexPatterns } from '../np_ready/public/services';

interface Arguments {
  index?: string | null;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  type?: string;
  schemas?: string;
  visConfig?: string;
  uiState?: string;
}

export type ExpressionFunctionVisualization = ExpressionFunction<
  'visualization',
  any,
  Arguments,
  Promise<Render<VisResponseValue>>
>;

export const visualization = (): ExpressionFunctionVisualization => ({
  name: 'visualization',
  type: 'render',
  help: i18n.translate('visualizations.functions.visualization.help', {
    defaultMessage: 'A simple visualization',
  }),
  args: {
    // TODO: Below `help` keys should be internationalized once this function
    // TODO: is moved to visualizations plugin.
    index: {
      types: ['string', 'null'],
      default: null,
      help: 'Index',
    },
    metricsAtAllLevels: {
      types: ['boolean'],
      default: false,
      help: 'Metrics levels',
    },
    partialRows: {
      types: ['boolean'],
      default: false,
      help: 'Partial rows',
    },
    type: {
      types: ['string'],
      default: '',
      help: 'Type',
    },
    schemas: {
      types: ['string'],
      default: '"{}"',
      help: 'Schemas',
    },
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: 'Visualization configuration',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
      help: 'User interface state',
    },
  },
  async fn(context, args, handlers) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private') as any;
    const queryFilter = Private(FilterBarQueryFilterProvider);

    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const schemas = args.schemas ? JSON.parse(args.schemas) : {};
    const visType = getTypes().get(args.type || 'histogram') as any;
    const indexPattern = args.index ? await getIndexPatterns().get(args.index) : null;

    const uiStateParams = args.uiState ? JSON.parse(args.uiState) : {};
    const uiState = new PersistedState(uiStateParams);

    if (typeof visType.requestHandler === 'function') {
      context = await visType.requestHandler({
        partialRows: args.partialRows,
        metricsAtAllLevels: args.metricsAtAllLevels,
        index: indexPattern,
        visParams: visConfigParams,
        timeRange: get(context, 'timeRange', null),
        query: get(context, 'query', null),
        filters: get(context, 'filters', null),
        uiState,
        inspectorAdapters: handlers.inspectorAdapters,
        queryFilter,
        forceFetch: true,
      });
    }

    if (typeof visType.responseHandler === 'function') {
      if (context.columns) {
        // assign schemas to aggConfigs
        context.columns.forEach((column: any) => {
          if (column.aggConfig) {
            column.aggConfig.aggConfigs.schemas = visType.schemas.all;
          }
        });

        Object.keys(schemas).forEach(key => {
          schemas[key].forEach((i: any) => {
            if (context.columns[i] && context.columns[i].aggConfig) {
              context.columns[i].aggConfig.schema = key;
            }
          });
        });
      }

      context = await visType.responseHandler(context, visConfigParams.dimensions);
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: args.type || '',
        visConfig: visConfigParams,
      },
    };
  },
});
