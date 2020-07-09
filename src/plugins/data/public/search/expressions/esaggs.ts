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

import { get, hasIn } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  KibanaContext,
  KibanaDatatable,
  ExpressionFunctionDefinition,
  KibanaDatatableColumn,
} from 'src/plugins/expressions/public';
import { calculateObjectHash } from '../../../../../plugins/kibana_utils/public';
import { PersistedState } from '../../../../../plugins/visualizations/public';
import { Adapters } from '../../../../../plugins/inspector/public';

import { IAggConfigs } from '../aggs';
import { ISearchSource } from '../search_source';
import { tabifyAggResponse } from '../tabify';
import {
  calculateBounds,
  Filter,
  getTime,
  IIndexPattern,
  isRangeFilter,
  Query,
  TimeRange,
} from '../../../common';
import { FilterManager } from '../../query';
import {
  getFieldFormats,
  getIndexPatterns,
  getQueryService,
  getSearchService,
} from '../../services';
import { buildTabularInspectorData } from './build_tabular_inspector_data';
import { getRequestInspectorStats, getResponseInspectorStats, serializeAggConfig } from './utils';

export interface RequestHandlerParams {
  searchSource: ISearchSource;
  aggs: IAggConfigs;
  timeRange?: TimeRange;
  timeFields?: string[];
  indexPattern?: IIndexPattern;
  query?: Query;
  filters?: Filter[];
  forceFetch: boolean;
  filterManager: FilterManager;
  uiState?: PersistedState;
  partialRows?: boolean;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  visParams?: any;
  abortSignal?: AbortSignal;
}

const name = 'esaggs';

type Input = KibanaContext | null;
type Output = Promise<KibanaDatatable>;

interface Arguments {
  index: string;
  metricsAtAllLevels: boolean;
  partialRows: boolean;
  includeFormatHints: boolean;
  aggConfigs: string;
  timeFields?: string[];
}

const handleCourierRequest = async ({
  searchSource,
  aggs,
  timeRange,
  timeFields,
  indexPattern,
  query,
  filters,
  forceFetch,
  partialRows,
  metricsAtAllLevels,
  inspectorAdapters,
  filterManager,
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

  requestSearchSource.setField('aggs', function () {
    return aggs.toDsl(metricsAtAllLevels);
  });

  requestSearchSource.onRequestStart((paramSearchSource, options) => {
    return aggs.onSearchRequestStart(paramSearchSource, options);
  });

  // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
  // pattern if it's available.
  const defaultTimeField = indexPattern?.getTimeField?.();
  const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
  const allTimeFields = timeFields && timeFields.length > 0 ? timeFields : defaultTimeFields;

  // If a timeRange has been specified and we had at least one timeField available, create range
  // filters for that those time fields
  if (timeRange && allTimeFields.length > 0) {
    timeFilterSearchSource.setField('filter', () => {
      return allTimeFields
        .map((fieldName) => getTime(indexPattern, timeRange, { fieldName }))
        .filter(isRangeFilter);
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
    if (hasIn(agg, 'type.postFlightRequest')) {
      resp = await agg.type.postFlightRequest(
        resp,
        aggs,
        agg,
        requestSearchSource,
        inspectorAdapters.requests,
        abortSignal
      );
    }
  }

  (searchSource as any).finalResponse = resp;

  const parsedTimeRange = timeRange ? calculateBounds(timeRange) : null;
  const tabifyParams = {
    metricsAtAllLevels,
    partialRows,
    timeRange: parsedTimeRange
      ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
      : undefined,
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
    () =>
      buildTabularInspectorData((searchSource as any).tabifiedResponse, {
        queryFilter: filterManager,
        deserializeFieldFormat: getFieldFormats().deserialize,
      }),
    { returnsFormattedValues: true }
  );

  return (searchSource as any).tabifiedResponse;
};

export const esaggs = (): ExpressionFunctionDefinition<typeof name, Input, Arguments, Output> => ({
  name,
  type: 'kibana_datatable',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('data.functions.esaggs.help', {
    defaultMessage: 'Run AggConfig aggregation',
  }),
  args: {
    index: {
      types: ['string'],
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
    timeFields: {
      types: ['string'],
      help: '',
      multi: true,
    },
  },
  async fn(input, args, { inspectorAdapters, abortSignal }) {
    const indexPatterns = getIndexPatterns();
    const { filterManager } = getQueryService();
    const searchService = getSearchService();

    const aggConfigsState = JSON.parse(args.aggConfigs);
    const indexPattern = await indexPatterns.get(args.index);
    const aggs = searchService.aggs.createAggConfigs(indexPattern, aggConfigsState);

    // we should move searchSource creation inside courier request handler
    const searchSource = await searchService.searchSource.create();

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 0);

    const response = await handleCourierRequest({
      searchSource,
      aggs,
      indexPattern,
      timeRange: get(input, 'timeRange', undefined),
      query: get(input, 'query', undefined) as any,
      filters: get(input, 'filters', undefined),
      timeFields: args.timeFields,
      forceFetch: true,
      metricsAtAllLevels: args.metricsAtAllLevels,
      partialRows: args.partialRows,
      inspectorAdapters: inspectorAdapters as Adapters,
      filterManager,
      abortSignal: (abortSignal as unknown) as AbortSignal,
    });

    const table: KibanaDatatable = {
      type: 'kibana_datatable',
      rows: response.rows,
      columns: response.columns.map((column: any) => {
        const cleanedColumn: KibanaDatatableColumn = {
          id: column.id,
          name: column.name,
          meta: serializeAggConfig(column.aggConfig),
        };
        if (args.includeFormatHints) {
          cleanedColumn.formatHint = column.aggConfig.toSerializedFieldFormat();
        }
        return cleanedColumn;
      }),
    };

    return table;
  },
});
