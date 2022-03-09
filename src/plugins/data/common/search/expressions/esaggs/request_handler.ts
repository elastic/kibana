/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Adapters } from 'src/plugins/inspector/common';

import { calculateBounds, Filter, IndexPattern, Query, TimeRange } from '../../../../common';

import { IAggConfigs } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';
import { tabifyAggResponse } from '../../tabify';

interface RequestHandlerParams {
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
  executionContext?: KibanaExecutionContext;
}

export const handleRequest = ({
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
  executionContext,
}: RequestHandlerParams) => {
  return defer(async () => {
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
    const requestSearchSource = timeFilterSearchSource.createChild({
      callParentStartHandlers: true,
    });

    // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
    // pattern if it's available.
    const defaultTimeField = indexPattern?.getTimeField?.();
    const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
    const allTimeFields = timeFields?.length ? timeFields : defaultTimeFields;

    aggs.setTimeRange(timeRange as TimeRange);
    aggs.setForceNow(forceNow);
    aggs.setTimeFields(allTimeFields);

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

    // If a timeRange has been specified and we had at least one timeField available, create range
    // filters for that those time fields
    if (timeRange && allTimeFields.length > 0) {
      timeFilterSearchSource.setField('filter', () => {
        return aggs.getSearchSourceTimeFilter(forceNow);
      });
    }

    requestSearchSource.setField('filter', filters);
    requestSearchSource.setField('query', query);

    return { allTimeFields, forceNow, requestSearchSource };
  }).pipe(
    switchMap(({ allTimeFields, forceNow, requestSearchSource }) =>
      requestSearchSource
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
          executionContext,
        })
        .pipe(
          map(({ rawResponse: response }) => {
            const parsedTimeRange = timeRange ? calculateBounds(timeRange, { forceNow }) : null;
            const tabifyParams = {
              metricsAtAllLevels: aggs.hierarchical,
              partialRows,
              timeRange: parsedTimeRange
                ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
                : undefined,
            };

            return tabifyAggResponse(aggs, response, tabifyParams);
          })
        )
    )
  );
};
