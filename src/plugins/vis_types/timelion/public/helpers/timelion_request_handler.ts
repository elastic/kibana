/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { DataView } from '@kbn/data-plugin/common';
import { Filter, buildEsQuery } from '@kbn/es-query';
import { KibanaContext, TimeRange, Query, getEsQueryConfig } from '@kbn/data-plugin/public';
import { TimelionVisDependencies } from '../plugin';
import { getTimezone } from './get_timezone';
import { TimelionVisParams } from '../timelion_vis_fn';
import { getDataSearch, getIndexPatterns } from './plugin_services';
import { VisSeries } from '../../common/vis_data';

interface Stats {
  cacheCount: number;
  invokeTime: number;
  queryCount: number;
  queryTime: number;
  sheetTime: number;
}

export interface Series extends VisSeries {
  _global?: Record<any, any>;
  _hide?: boolean;
  _id?: number;
  _title?: string;
  fit: string;
  split: string;
  type: string;
}

export interface Sheet {
  list: Series[];
  render?: {
    grid?: boolean;
  };
  type: string;
}

export interface TimelionSuccessResponse {
  sheet: Sheet[];
  stats: Stats;
  visType: string;
  type: KibanaContext['type'];
}

export function getTimelionRequestHandler({
  uiSettings,
  http,
  timefilter,
  expressionAbortSignal,
}: TimelionVisDependencies & {
  expressionAbortSignal: AbortSignal;
}) {
  const timezone = getTimezone(uiSettings);

  return async function ({
    timeRange,
    filters,
    query,
    visParams,
    searchSessionId,
    executionContext,
  }: {
    timeRange: TimeRange;
    filters: Filter[];
    query: Query;
    visParams: TimelionVisParams;
    searchSessionId?: string;
    executionContext?: KibanaExecutionContext;
  }): Promise<TimelionSuccessResponse> {
    const dataSearch = getDataSearch();
    const expression = visParams.expression;
    const abortController = new AbortController();
    const expressionAbortHandler = function () {
      abortController.abort();
    };

    expressionAbortSignal.addEventListener('abort', expressionAbortHandler);

    if (!expression) {
      throw new Error(
        i18n.translate('timelion.emptyExpressionErrorMessage', {
          defaultMessage: 'Timelion error: No expression provided',
        })
      );
    }

    let dataView: DataView | undefined;
    const firstFilterIndex = filters[0]?.meta.index;
    if (firstFilterIndex) {
      dataView = await getIndexPatterns()
        .get(firstFilterIndex)
        .catch(() => undefined);
    }

    const esQueryConfigs = getEsQueryConfig(uiSettings);

    // parse the time range client side to make sure it behaves like other charts
    const timeRangeBounds = timefilter.calculateBounds(timeRange);
    const untrackSearch =
      dataSearch.session.isCurrentSession(searchSessionId) &&
      dataSearch.session.trackSearch({
        abort: () => abortController.abort(),
      });

    try {
      const searchSessionOptions = dataSearch.session.getSearchOptions(searchSessionId);
      return await http.post('/api/timelion/run', {
        body: JSON.stringify({
          sheet: [expression],
          extended: {
            es: {
              filter: buildEsQuery(dataView, query, filters, esQueryConfigs),
            },
          },
          time: {
            from: timeRangeBounds.min,
            to: timeRangeBounds.max,
            interval: visParams.interval,
            timezone,
          },
          ...(searchSessionOptions && {
            searchSession: searchSessionOptions,
          }),
        }),
        context: executionContext,
        signal: abortController.signal,
      });
    } catch (e) {
      if (e && e.body) {
        const err = new Error(
          `${i18n.translate('timelion.requestHandlerErrorTitle', {
            defaultMessage: 'Timelion request error',
          })}:${e.body.title ? ' ' + e.body.title : ''} ${e.body.message}`
        );
        err.stack = e.stack;
        throw err;
      } else {
        throw e;
      }
    } finally {
      if (untrackSearch && dataSearch.session.isCurrentSession(searchSessionId)) {
        // call `untrack` if this search still belongs to current session
        untrackSearch();
      }
      expressionAbortSignal.removeEventListener('abort', expressionAbortHandler);
    }
  };
}
