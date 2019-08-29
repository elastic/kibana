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
import { CourierRequestHandlerProvider } from 'ui/vis/request_handlers/courier';
// @ts-ignore
import { AggConfigs } from 'ui/vis/agg_configs.js';
import { createFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';
import chrome from 'ui/chrome';

// need to get rid of angular from these
// @ts-ignore
import { SearchSourceProvider } from 'ui/courier/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { IndexPatternsProvider } from '../../../data/public';

const courierRequestHandlerProvider = CourierRequestHandlerProvider;
const courierRequestHandler = courierRequestHandlerProvider().handler;

import { ExpressionFunction, KibanaDatatableColumn } from '../../types';
import { KibanaContext, KibanaDatatable } from '../../common';

const name = 'esaggs';

type Context = KibanaContext | null;

interface Arguments {
  index: string | null;
  metricsAtAllLevels: boolean;
  partialRows: boolean;
  includeFormatHints: boolean;
  aggConfigs: string;
}

type Return = Promise<KibanaDatatable>;

export const esaggs = (): ExpressionFunction<typeof name, Context, Arguments, Return> => ({
  name,
  type: 'kibana_datatable',
  context: {
    types: ['kibana_context', 'null'],
  },
  help: i18n.translate('interpreter.functions.esaggs.help', {
    defaultMessage: 'Run AggConfig aggregation',
  }),
  args: {
    index: {
      types: ['string', 'null'],
      default: null,
      help: '',
    },
    metricsAtAllLevels: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    partialRows: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    includeFormatHints: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    aggConfigs: {
      types: ['string'],
      default: '""',
      help: '',
    },
  },
  async fn(context, args, { inspectorAdapters, abortSignal }) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private: Function = $injector.get('Private');
    const indexPatterns = Private(IndexPatternsProvider);
    const SearchSource = Private(SearchSourceProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

    const aggConfigsState = JSON.parse(args.aggConfigs);
    const indexPattern = await indexPatterns.get(args.index);
    const aggs = new AggConfigs(indexPattern, aggConfigsState);

    // we should move searchSource creation inside courier request handler
    const searchSource = new SearchSource();
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 0);

    const response = await courierRequestHandler({
      searchSource,
      aggs,
      timeRange: get(context, 'timeRange', undefined),
      query: get(context, 'query', undefined),
      filters: get(context, 'filters', undefined),
      forceFetch: true,
      metricsAtAllLevels: args.metricsAtAllLevels,
      partialRows: args.partialRows,
      inspectorAdapters,
      queryFilter,
      abortSignal: (abortSignal as unknown) as AbortSignal,
    });

    const table: KibanaDatatable = {
      type: 'kibana_datatable',
      rows: response.rows,
      columns: response.columns.map((column: any) => {
        const cleanedColumn: KibanaDatatableColumn = {
          id: column.id,
          name: column.name,
        };
        if (args.includeFormatHints) {
          cleanedColumn.formatHint = createFormat(column.aggConfig);
        }
        return cleanedColumn;
      }),
    };

    return table;
  },
});
