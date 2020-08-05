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
import { VisResponseValue, PersistedState } from '../../../../plugins/visualizations/public';
import { ExpressionFunctionDefinition, Render } from '../../../../plugins/expressions/public';
import { getTypes, getIndexPatterns, getFilterManager, getSearch } from '../services';

interface Arguments {
  index?: string | null;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  type?: string;
  schemas?: string;
  visConfig?: string;
  uiState?: string;
  aggConfigs?: string;
}

export type ExpressionFunctionVisualization = ExpressionFunctionDefinition<
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
    aggConfigs: {
      types: ['string'],
      default: '"{}"',
      help: 'Aggregation configurations',
    },
  },
  async fn(input, args, { inspectorAdapters }) {
    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const schemas = args.schemas ? JSON.parse(args.schemas) : {};
    const visType = getTypes().get(args.type || 'histogram') as any;
    const indexPattern = args.index ? await getIndexPatterns().get(args.index) : null;

    const uiStateParams = args.uiState ? JSON.parse(args.uiState) : {};
    const uiState = new PersistedState(uiStateParams);

    const aggConfigsState = args.aggConfigs ? JSON.parse(args.aggConfigs) : [];
    const aggs = indexPattern
      ? getSearch().aggs.createAggConfigs(indexPattern, aggConfigsState)
      : undefined;

    if (typeof visType.requestHandler === 'function') {
      input = await visType.requestHandler({
        partialRows: args.partialRows,
        metricsAtAllLevels: args.metricsAtAllLevels,
        index: indexPattern,
        visParams: visConfigParams,
        timeRange: get(input, 'timeRange', null),
        query: get(input, 'query', null),
        filters: get(input, 'filters', null),
        uiState,
        inspectorAdapters,
        queryFilter: getFilterManager(),
        forceFetch: true,
        aggs,
      });
    }

    if (typeof visType.responseHandler === 'function') {
      if (input.columns) {
        // assign schemas to aggConfigs
        input.columns.forEach((column: any) => {
          if (column.aggConfig) {
            column.aggConfig.aggConfigs.schemas = visType.schemas.all;
          }
        });

        Object.keys(schemas).forEach((key) => {
          schemas[key].forEach((i: any) => {
            if (input.columns[i] && input.columns[i].aggConfig) {
              input.columns[i].aggConfig.schema = key;
            }
          });
        });
      }

      input = await visType.responseHandler(input, visConfigParams.dimensions);
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: input,
        visType: args.type || '',
        visConfig: visConfigParams,
      },
    };
  },
});
