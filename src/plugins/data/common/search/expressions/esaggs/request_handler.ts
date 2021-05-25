/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { IAggConfigs } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';
import { tabifyAggResponse } from '../../tabify';

/** @internal */
export interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  aggs: IAggConfigs;
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
  filters,
  indexPattern,
  inspectorAdapters,
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
  aggs.setTimeFields(timeFields);

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

  requestSearchSource.setField('aggs', aggs);

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

  inspectorAdapters.requests?.reset();

  const { rawResponse: response } = await requestSearchSource
    .fetch$({
      abortSignal,
      sessionId: searchSessionId,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('data.functions.esaggs.inspector.dataRequest.title', {
          defaultMessage: 'Data',
        }),
        description: i18n.translate('data.functions.esaggs.inspector.dataRequest.description', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the data for the visualization.',
        }),
      },
    })
    .toPromise();

  const parsedTimeRange = timeRange ? calculateBounds(timeRange, { forceNow }) : null;
  const tabifyParams = {
    metricsAtAllLevels: aggs.hierarchical,
    partialRows,
    timeRange: parsedTimeRange
      ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
      : undefined,
  };

  const tabifiedResponse = tabifyAggResponse(aggs, response, tabifyParams);

  return tabifiedResponse;
};
