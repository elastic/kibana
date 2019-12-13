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

import { get, has } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AggConfigs } from 'ui/agg_types/agg_configs';
import { createFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';
import chrome from 'ui/chrome';
import { Query, TimeRange, esFilters } from 'src/plugins/data/public';
import {
  KibanaContext,
  KibanaDatatable,
  ExpressionFunction,
  KibanaDatatableColumn,
} from 'src/plugins/expressions/public';
import { npStart } from 'ui/new_platform';
import {
  SearchSource,
  SearchSourceContract,
  getRequestInspectorStats,
  getResponseInspectorStats,
} from '../../../../../ui/public/courier';
// @ts-ignore
import {
  FilterBarQueryFilterProvider,
  QueryFilter,
} from '../../../../../ui/public/filter_manager/query_filter';

import { buildTabularInspectorData } from '../../../../../ui/public/inspector/build_tabular_inspector_data';
import { calculateObjectHash } from '../../../../visualizations/public';
import { getTime } from '../../../../../ui/public/timefilter';
// @ts-ignore
import { tabifyAggResponse } from '../../../../../ui/public/agg_response/tabify/tabify';
import { PersistedState } from '../../../../../ui/public/persisted_state';
import { Adapters } from '../../../../../../plugins/inspector/public';

export interface RequestHandlerParams {
  searchSource: SearchSourceContract;
  aggs: AggConfigs;
  timeRange?: TimeRange;
  query?: Query;
  filters?: esFilters.Filter[];
  forceFetch: boolean;
  queryFilter: QueryFilter;
  uiState?: PersistedState;
  partialRows?: boolean;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  visParams?: any;
  abortSignal?: AbortSignal;
}

const name = 'esaggs';

type Context = KibanaContext | null;

interface Arguments {
  index: string;
  metricsAtAllLevels: boolean;
  partialRows: boolean;
  includeFormatHints: boolean;
  aggConfigs: string;
}

type Return = Promise<KibanaDatatable>;

const handleCourierRequest = async ({
  searchSource,
  aggs,
  timeRange,
  query,
  filters,
  forceFetch,
  partialRows,
  metricsAtAllLevels,
  inspectorAdapters,
  queryFilter,
  abortSignal,
}: RequestHandlerParams) => {
  // Create a new search source that inherits the original search source
  // but has the appropriate timeRange applied via a filter.
  // This is a temporary solution until we properly pass down all required
  // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
  // Using callParentStartHandlers: true we make sure, that the parent searchSource
  // onSearchRequestStart will be called properly even though we use an inherited
  // search source.
  const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
  const requestSearchSource = timeFilterSearchSource.createChild({ callParentStartHandlers: true });

  aggs.setTimeRange(timeRange as TimeRange);

  // For now we need to mirror the history of the passed search source, since
  // the request inspector wouldn't work otherwise.
  Object.defineProperty(requestSearchSource, 'history', {
    get() {
      return searchSource.history;
    },
    set(history) {
      return (searchSource.history = history);
    },
  });

  requestSearchSource.setField('aggs', function() {
    return aggs.toDsl(metricsAtAllLevels);
  });

  requestSearchSource.onRequestStart((paramSearchSource, options) => {
    return aggs.onSearchRequestStart(paramSearchSource, options);
  });

  if (timeRange) {
    timeFilterSearchSource.setField('filter', () => {
      return getTime(searchSource.getField('index'), timeRange);
    });
  }

  requestSearchSource.setField('filter', filters);
  requestSearchSource.setField('query', query);

  const reqBody = await requestSearchSource.getSearchRequestBody();

  const queryHash = calculateObjectHash(reqBody);
  // We only need to reexecute the query, if forceFetch was true or the hash of the request body has changed
  // since the last request
  const shouldQuery = forceFetch || (searchSource as any).lastQuery !== queryHash;

  if (shouldQuery) {
    inspectorAdapters.requests.reset();
    const request = inspectorAdapters.requests.start(
      i18n.translate('data.functions.esaggs.inspector.dataRequest.title', {
        defaultMessage: 'Data',
      }),
      {
        description: i18n.translate('data.functions.esaggs.inspector.dataRequest.description', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the data for the visualization.',
        }),
      }
    );
    request.stats(getRequestInspectorStats(requestSearchSource));

    try {
      const response = await requestSearchSource.fetch({ abortSignal });

      (searchSource as any).lastQuery = queryHash;

      request.stats(getResponseInspectorStats(searchSource, response)).ok({ json: response });

      (searchSource as any).rawResponse = response;
    } catch (e) {
      // Log any error during request to the inspector
      request.error({ json: e });
      throw e;
    } finally {
      // Add the request body no matter if things went fine or not
      requestSearchSource.getSearchRequestBody().then((req: unknown) => {
        request.json(req);
      });
    }
  }

  // Note that rawResponse is not deeply cloned here, so downstream applications using courier
  // must take care not to mutate it, or it could have unintended side effects, e.g. displaying
  // response data incorrectly in the inspector.
  let resp = (searchSource as any).rawResponse;
  for (const agg of aggs.aggs) {
    if (has(agg, 'type.postFlightRequest')) {
      resp = await agg.type.postFlightRequest(
        resp,
        aggs,
        agg,
        requestSearchSource,
        inspectorAdapters,
        abortSignal
      );
    }
  }

  (searchSource as any).finalResponse = resp;

  const parsedTimeRange = timeRange ? getTime(aggs.indexPattern, timeRange) : null;
  const tabifyParams = {
    metricsAtAllLevels,
    partialRows,
    timeRange: parsedTimeRange ? parsedTimeRange.range : undefined,
  };

  const tabifyCacheHash = calculateObjectHash({ tabifyAggs: aggs, ...tabifyParams });
  // We only need to reexecute tabify, if either we did a new request or some input params to tabify changed
  const shouldCalculateNewTabify =
    shouldQuery || (searchSource as any).lastTabifyHash !== tabifyCacheHash;

  if (shouldCalculateNewTabify) {
    (searchSource as any).lastTabifyHash = tabifyCacheHash;
    (searchSource as any).tabifiedResponse = tabifyAggResponse(
      aggs,
      (searchSource as any).finalResponse,
      tabifyParams
    );
  }

  inspectorAdapters.data.setTabularLoader(
    () => buildTabularInspectorData((searchSource as any).tabifiedResponse, queryFilter),
    { returnsFormattedValues: true }
  );

  return (searchSource as any).tabifiedResponse;
};

export const esDemoSearch = (): ExpressionFunction<typeof name, Context, Arguments, Return> => ({
  name,
  type: 'kibana_datatable',
  context: {
    types: ['kibana_context', 'null'],
  },
  help: i18n.translate('data.functions.esSearch.help', {
    defaultMessage: 'esDemoSearch',
  }),
  args: {},
  async fn(context, args, { inspectorAdapters, abortSignal, search }) {
    const response = await search({ id: 'test' }, {}, ASYNC_DEMO_SEARCH_STRATEGY).toPromise();

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
