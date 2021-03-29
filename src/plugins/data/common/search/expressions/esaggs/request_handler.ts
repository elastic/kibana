/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { DatatableColumn, DatatableRow } from 'src/plugins/expressions';
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

import { FilterValue, IAggConfigs } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';
import { tabifyAggResponse } from '../../tabify';
import { getRequestInspectorStats, getResponseInspectorStats } from '../utils';

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

  const timeShifts: Record<string, moment.Duration> = {};
  aggs
    .getAll()
    .filter((agg) => agg.schema === 'metric')
    .map((agg) => agg.getTimeShift())
    .forEach((timeShift) => {
      if (timeShift) {
        timeShifts[String(timeShift.asMilliseconds())] = timeShift;
      }
    });

  const originalAggs = aggs;

  const buildBaseResponse = async () => {
    const currentAggs = aggs;
    const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
    const requestSearchSource = timeFilterSearchSource.createChild({
      callParentStartHandlers: true,
    });

    const currentTimeRange: TimeRange | undefined = timeRange ? { ...timeRange } : undefined;

    currentAggs.setTimeRange(currentTimeRange as TimeRange);

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
      return currentAggs.toDsl(metricsAtAllLevels);
    });

    requestSearchSource.onRequestStart((paramSearchSource, options) => {
      return currentAggs.onSearchRequestStart(paramSearchSource, options);
    });

    // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
    // pattern if it's available.
    const defaultTimeField = indexPattern?.getTimeField?.();
    const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
    const allTimeFields = timeFields && timeFields.length > 0 ? timeFields : defaultTimeFields;

    // If a timeRange has been specified and we had at least one timeField available, create range
    // filters for that those time fields
    if (currentTimeRange && allTimeFields.length > 0) {
      timeFilterSearchSource.setField('filter', () => {
        return allTimeFields
          .map((fieldName) => getTime(indexPattern, currentTimeRange, { fieldName, forceNow }))
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
      (requestSearchSource as any).rawResponse = response;
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
    let response = (requestSearchSource as any).rawResponse;
    for (const agg of currentAggs.aggs) {
      if (agg.enabled && typeof agg.type.postFlightRequest === 'function') {
        response = await agg.type.postFlightRequest(
          response,
          currentAggs,
          agg,
          requestSearchSource,
          inspectorAdapters.requests,
          abortSignal,
          searchSessionId
        );
      }
    }

    const parsedTimeRange = currentTimeRange
      ? calculateBounds(currentTimeRange, { forceNow })
      : null;
    const tabifyParams = {
      metricsAtAllLevels,
      partialRows,
      timeRange: parsedTimeRange
        ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
        : undefined,
    };

    const tabifiedResponse = tabifyAggResponse(currentAggs, response, tabifyParams);
    return tabifiedResponse;
  };

  const baseResponse = await buildBaseResponse();

  const filterableAggLength = aggs.aggs.filter((agg) => agg.schema === 'segment').length;

  const partialResponses = await Promise.all(
    Object.values(timeShifts).map(async (timeShift) => {
      const currentAggs = aggs.clone();
      // assuming those are ordered correctly
      const filterableAggs = currentAggs.aggs.filter((agg) => agg.schema === 'segment');
      const rootFilterAgg = currentAggs.createAggConfig(
        {
          type: 'filters',
          id: 'rootSerialization',
          params: {
            filters: baseResponse.rows.map<FilterValue>((row, rowIndex) => {
              const filter: Filter = {
                meta: {
                  alias: null,
                  disabled: false,
                  negate: false,
                },
                query: {
                  bool: {
                    filter: filterableAggs.map((a, i) => {
                      return a.getTimeShiftedFilter(timeShift, row[baseResponse.columns[i].id]);
                    }),
                  },
                },
              };
              return {
                input: {
                  query: filter,
                  language: 'rawQuery',
                },
                label: `serialized-row-${rowIndex}`,
                id: `serialized-row-${rowIndex}`,
              };
            }),
          },
          enabled: true,
        },
        {
          addToAggConfigs: true,
        }
      );
      currentAggs.aggs = [
        rootFilterAgg,
        ...currentAggs.aggs.filter((agg) => agg.schema === 'metric'),
      ];
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

      const currentTimeRange: TimeRange | undefined = timeRange ? { ...timeRange } : undefined;

      if (currentTimeRange) {
        if (currentTimeRange.from) {
          currentTimeRange.from = moment(currentTimeRange.from).subtract(timeShift).toISOString();
        }

        if (currentTimeRange.from) {
          currentTimeRange.to = moment(currentTimeRange.to).subtract(timeShift).toISOString();
        }
      }

      currentAggs.setTimeRange(currentTimeRange as TimeRange);

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
        return currentAggs.toDsl(metricsAtAllLevels);
      });

      requestSearchSource.onRequestStart((paramSearchSource, options) => {
        return currentAggs.onSearchRequestStart(paramSearchSource, options);
      });

      // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
      // pattern if it's available.
      const defaultTimeField = indexPattern?.getTimeField?.();
      const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
      const allTimeFields = timeFields && timeFields.length > 0 ? timeFields : defaultTimeFields;

      // If a timeRange has been specified and we had at least one timeField available, create range
      // filters for that those time fields
      if (currentTimeRange && allTimeFields.length > 0) {
        timeFilterSearchSource.setField('filter', () => {
          return allTimeFields
            .map((fieldName) => getTime(indexPattern, currentTimeRange, { fieldName, forceNow }))
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

        if (!timeShift) {
          (searchSource as any).rawResponse = response;
        }
        (requestSearchSource as any).rawResponse = response;
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
      let response = (requestSearchSource as any).rawResponse;
      for (const agg of currentAggs.aggs) {
        if (agg.enabled && typeof agg.type.postFlightRequest === 'function') {
          response = await agg.type.postFlightRequest(
            response,
            currentAggs,
            agg,
            requestSearchSource,
            inspectorAdapters.requests,
            abortSignal,
            searchSessionId
          );
        }
      }

      const parsedTimeRange = currentTimeRange
        ? calculateBounds(currentTimeRange, { forceNow })
        : null;
      const tabifyParams = {
        metricsAtAllLevels,
        partialRows,
        timeRange: parsedTimeRange
          ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
          : undefined,
      };

      const tabifiedResponse = tabifyAggResponse(currentAggs, response, tabifyParams);

      return tabifiedResponse;
    })
  );

  // todo - do an outer join on all partial responses
  if (partialResponses.length > 0) {
    // fullResponse.rows.forEach((row) => {
    //   fullResponse.columns.forEach((column) => {
    //     const columnAgg = aggs.aggs.find((a) => a.id === column.meta.sourceParams.id)!;
    //     if (
    //       columnAgg.getTimeShift()?.asMilliseconds() !== fullResponseTimeShift?.asMilliseconds()
    //     ) {
    //       delete row[column.id];
    //     }
    //   });
    // });
    // const joinAggs = aggs
    //   .bySchemaName('bucket')
    //   .filter((agg) => !timeFields || !timeFields.includes(agg.fieldName()));
    // const joinColumns = fullResponse.columns.filter(
    //   (c) =>
    //     c.meta.sourceParams.schema !== 'metric' &&
    //     (!timeFields || !timeFields.includes(c.meta.sourceParams?.params?.field))
    // );
    // const timeJoinAggs = aggs
    //   .bySchemaName('bucket')
    //   .filter((agg) => timeFields && timeFields.includes(agg.fieldName()));
    // const timeJoinColumns = fullResponse.columns.filter(
    //   (c) =>
    //     c.meta.sourceParams.schema !== 'metric' &&
    //     timeFields &&
    //     timeFields.includes(c.meta.sourceParams?.params?.field)
    // );
    partialResponses.forEach((partialResponse, index) => {
      const timeShift = Object.values(timeShifts)[index];
      const missingColIndexes: number[] = [];
      partialResponse.columns.forEach((column, colIndex) => {
        // skip the serialized filters agg
        if (colIndex === 0) {
          return;
        }
        const columnAgg = aggs.aggs.find((a) => a.id === column.meta.sourceParams.id)!;
        if (columnAgg.getTimeShift()?.asMilliseconds() === timeShift?.asMilliseconds()) {
          missingColIndexes.push(colIndex - 1 + filterableAggLength);
        }
      });
      partialResponse.rows.forEach((row, i2) => {
        const targetRowIndex = i2;
        missingColIndexes.forEach((baseResponseIndex) => {
          baseResponse.rows[targetRowIndex][baseResponse.columns[baseResponseIndex].id] =
            row[partialResponse.columns[baseResponseIndex + 1 - filterableAggLength].id];
        });
      });
    });
    return baseResponse;
  } else {
    return baseResponse;
  }
};
function getColumnIdentifier(
  joinColumns: DatatableColumn[],
  row: DatatableRow,
  timeJoinColumns: DatatableColumn[],
  timeShift: moment.Duration | undefined
) {
  const joinStr = joinColumns.map((c) => String(row[c.id]));
  const timeJoinStr = timeJoinColumns.map((c) =>
    String(moment(row[c.id]).add(timeShift).valueOf())
  );
  return joinStr.join(',') + timeJoinStr.join(',');
}
