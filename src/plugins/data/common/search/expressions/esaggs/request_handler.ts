/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
import { FormatFactory } from '../../../../common/field_formats/utils';

import { IAggConfigs } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';
import { tabifyAggResponse } from '../../tabify';
import { getRequestInspectorStats, getResponseInspectorStats } from '../utils';

/** @internal */
export interface RequestHandlerParams {
  abortSignal?: AbortSignal;
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
  getNow?: () => Date;
}

export const handleRequest = async ({
  abortSignal,
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
  getNow,
}: RequestHandlerParams) => {
  const forceNow = getNow?.();
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
        .map((fieldName) => getTime(indexPattern, timeRange, { fieldName, forceNow }))
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
    if (agg.enabled && typeof agg.type.postFlightRequest === 'function') {
      response = await agg.type.postFlightRequest(
        response,
        aggs,
        agg,
        requestSearchSource,
        inspectorAdapters.requests,
        abortSignal,
        searchSessionId
      );
    }
  }

  const parsedTimeRange = timeRange ? calculateBounds(timeRange, { forceNow }) : null;
  const tabifyParams = {
    metricsAtAllLevels,
    partialRows,
    timeRange: parsedTimeRange
      ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
      : undefined,
  };

  const tabifiedResponse = tabifyAggResponse(aggs, response, tabifyParams);

  return tabifiedResponse;
};
