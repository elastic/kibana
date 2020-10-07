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
import { map, switchMap } from 'rxjs/operators';
import { Datatable, DatatableColumn } from 'src/plugins/expressions/public';
import { combineLatest, from } from 'rxjs';
import { PersistedState } from '../../../../../plugins/visualizations/public';
import { Adapters } from '../../../../../plugins/inspector/public';

import {
  calculateBounds,
  EsaggsExpressionFunctionDefinition,
  Filter,
  getTime,
  IIndexPattern,
  isRangeFilter,
  Query,
  TimeRange,
} from '../../../common';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
  IAggConfigs,
  ISearchSource,
  tabifyAggResponse,
} from '../../../common/search';

import { FilterManager } from '../../query';
import {
  getFieldFormats,
  getIndexPatterns,
  getQueryService,
  getSearchService,
} from '../../services';
import { buildTabularInspectorData } from './build_tabular_inspector_data';

export interface RequestHandlerParams {
  searchSource: ISearchSource;
  aggs: IAggConfigs;
  timeRange?: TimeRange;
  timeFields?: string[];
  indexPattern?: IIndexPattern;
  query?: Query;
  filters?: Filter[];
  filterManager: FilterManager;
  uiState?: PersistedState;
  partialRows?: boolean;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  visParams?: any;
  abortSignal?: AbortSignal;
  searchSessionId?: string;
}

const name = 'esaggs';

const handleCourierRequest = ({
  searchSource,
  aggs,
  timeRange,
  timeFields,
  indexPattern,
  query,
  filters,
  partialRows,
  metricsAtAllLevels,
  inspectorAdapters,
  filterManager,
  abortSignal,
  searchSessionId,
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
      searchSessionId,
    }
  );
  request.stats(getRequestInspectorStats(requestSearchSource));

  const resolvedTimeRange = timeRange && calculateBounds(timeRange);

  try {
    return requestSearchSource
      .fetchPartial({
        abortSignal,
        sessionId: searchSessionId,
      })
      .pipe(
        map((response) => {
          request.stats(getResponseInspectorStats(response, searchSource)).ok({ json: response });

          const parsedTimeRange = timeRange ? calculateBounds(timeRange) : null;
          const tabifyParams = {
            metricsAtAllLevels,
            partialRows,
            timeRange: parsedTimeRange
              ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
              : undefined,
          };

          (searchSource as any).finalResponse = response;

          const tabifiedResponse = tabifyAggResponse(
            aggs,
            (searchSource as any).finalResponse,
            tabifyParams
          );

          (searchSource as any).tabifiedResponse = tabifiedResponse;

          inspectorAdapters.data.setTabularLoader(
            () =>
              buildTabularInspectorData((searchSource as any).tabifiedResponse, {
                queryFilter: filterManager,
                deserializeFieldFormat: getFieldFormats().deserialize,
              }),
            { returnsFormattedValues: true }
          );

          (searchSource as any).rawResponse = response;

          return tabifiedResponse;
        }),
        map((response) => {
          const table: Datatable = {
            type: 'datatable',
            rows: response.rows,
            columns: response.columns.map((column) => {
              const cleanedColumn: DatatableColumn = {
                id: column.id,
                name: column.name,
                meta: {
                  type: column.aggConfig.params.field?.type || 'number',
                  field: column.aggConfig.params.field?.name,
                  index: indexPattern?.title,
                  params: column.aggConfig.toSerializedFieldFormat(),
                  source: 'esaggs',
                  sourceParams: {
                    indexPatternId: indexPattern?.id,
                    appliedTimeRange:
                      column.aggConfig.params.field?.name &&
                      timeRange &&
                      timeFields &&
                      timeFields.includes(column.aggConfig.params.field?.name)
                        ? {
                            from: resolvedTimeRange?.min?.toISOString(),
                            to: resolvedTimeRange?.max?.toISOString(),
                          }
                        : undefined,
                    ...column.aggConfig.serialize(),
                  },
                },
              };
              return cleanedColumn;
            }),
          };

          return table;
        })
      );
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
};

export const esaggs = (): EsaggsExpressionFunctionDefinition => ({
  name,
  type: 'datatable',
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
  fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, isPartial }) {
    const indexPatterns = getIndexPatterns();
    const { filterManager } = getQueryService();
    const searchService = getSearchService();

    const aggConfigsState = JSON.parse(args.aggConfigs);

    inspectorAdapters.partial = isPartial();

    return combineLatest([
      from(indexPatterns.get(args.index)),
      from(searchService.searchSource.create()),
    ]).pipe(
      map(([indexPattern, searchSource]) => {
        const aggs = searchService.aggs.createAggConfigs(indexPattern, aggConfigsState);
        searchSource.setField('index', indexPattern);
        searchSource.setField('size', 0);
        return { aggs, indexPattern, searchSource };
      }),
      switchMap(({ aggs, indexPattern, searchSource }) => {
        return handleCourierRequest({
          searchSource,
          aggs,
          indexPattern,
          timeRange: get(input, 'timeRange', undefined),
          query: get(input, 'query', undefined) as any,
          filters: get(input, 'filters', undefined),
          timeFields: args.timeFields,
          metricsAtAllLevels: args.metricsAtAllLevels,
          partialRows: args.partialRows,
          inspectorAdapters: inspectorAdapters as Adapters,
          filterManager,
          abortSignal: (abortSignal as unknown) as AbortSignal,
          searchSessionId: getSearchSessionId(),
        });
      })
    );
  },
});
