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

import { i18n } from '@kbn/i18n';
import { Adapters } from 'src/plugins/inspector/common';

import {
  calculateBounds,
  Filter,
  getTime,
  IndexPattern,
  isRangeFilter,
  Query,
  TimeRange,
} from '../../../../common';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
  IAggConfigs,
  ISearchStartSearchSource,
  tabifyAggResponse,
} from '../../../../common/search';
import { FormatFactory } from '../../../../common/field_formats/utils';

import { AddFilters, buildTabularInspectorData } from './build_tabular_inspector_data';

interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  addFilters?: AddFilters;
  aggs: IAggConfigs;
  deserializeFieldFormat: FormatFactory;
  filters?: Filter[];
  indexPattern?: IndexPattern;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  query?: Query;
  searchSessionId?: string;
  searchSourceService: ISearchStartSearchSource;
  timeFields?: string[];
  timeRange?: TimeRange;
}

export const handleRequest = async ({
  abortSignal,
  addFilters,
  aggs,
  deserializeFieldFormat,
  filters,
  indexPattern,
  inspectorAdapters,
  metricsAtAllLevels,
  partialRows,
  query,
  searchSessionId,
  searchSourceService,
  timeFields,
  timeRange,
}: RequestHandlerParams) => {
  const searchSource = await searchSourceService.create();

  searchSource.setField('index', indexPattern);
  searchSource.setField('size', 0);

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

  let request;
  if (inspectorAdapters.requests) {
    inspectorAdapters.requests.reset();
    request = inspectorAdapters.requests.start(
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
  }

  try {
    const response = await requestSearchSource.fetch({
      abortSignal,
      sessionId: searchSessionId,
    });

    if (request) {
      request.stats(getResponseInspectorStats(response, searchSource)).ok({ json: response });
    }

    (searchSource as any).rawResponse = response;
  } catch (e) {
    // Log any error during request to the inspector
    if (request) {
      request.error({ json: e });
    }
    throw e;
  } finally {
    // Add the request body no matter if things went fine or not
    if (request) {
      request.json(await requestSearchSource.getSearchRequestBody());
    }
  }

  // Note that rawResponse is not deeply cloned here, so downstream applications using courier
  // must take care not to mutate it, or it could have unintended side effects, e.g. displaying
  // response data incorrectly in the inspector.
  let response = (searchSource as any).rawResponse;
  for (const agg of aggs.aggs) {
    if (typeof agg.type.postFlightRequest === 'function') {
      response = await agg.type.postFlightRequest(
        response,
        aggs,
        agg,
        requestSearchSource,
        inspectorAdapters.requests,
        abortSignal
      );
    }
  }

  const parsedTimeRange = timeRange ? calculateBounds(timeRange) : null;
  const tabifyParams = {
    metricsAtAllLevels,
    partialRows,
    timeRange: parsedTimeRange
      ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
      : undefined,
  };

  const tabifiedResponse = tabifyAggResponse(aggs, response, tabifyParams);

  if (inspectorAdapters.data) {
    inspectorAdapters.data.setTabularLoader(
      () =>
        buildTabularInspectorData(tabifiedResponse, {
          addFilters,
          deserializeFieldFormat,
        }),
      { returnsFormattedValues: true }
    );
  }

  return tabifiedResponse;
};
