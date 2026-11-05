/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This function collects statistics from a SearchSource and a response
 * for the usage in the inspector stats panel. Pass in a searchSource and a response
 * and the returned object can be passed to the `stats` method of the request
 * logger.
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';
import type { ISearchSource } from '../../../../public';
import {
  getDslRequestInspectorStats,
  getDslResponseInspectorStats,
} from '../../search_methods/inspector_stats';

/** @public */
export function getRequestInspectorStats(searchSource: ISearchSource) {
  const stats: RequestStatistics = {};
  const index = searchSource.getField('index');
  const indexFilters = searchSource.getActiveIndexFilter();

  if (index) {
    if (indexFilters.length > 0) {
      stats.indexFilter = {
        label: i18n.translate('data.search.searchSource.indexFilterLabel', {
          defaultMessage: 'Index Pattern',
        }),
        value: indexFilters.join(', '),
        description: i18n.translate('data.search.searchSource.indexFilterDescription', {
          defaultMessage: 'The active index pattern.',
        }),
      };
    }
  }

  return { ...stats, ...getDslRequestInspectorStats(index) };
}

/** @public */
export function getResponseInspectorStats(
  resp?: estypes.SearchResponse<unknown>,
  searchSource?: ISearchSource
) {
  const lastRequest =
    searchSource?.history && searchSource.history[searchSource.history.length - 1];
  const stats: RequestStatistics = {};

  if (lastRequest && (lastRequest.ms === 0 || lastRequest.ms)) {
    stats.requestTime = {
      label: i18n.translate('data.search.searchSource.requestTimeLabel', {
        defaultMessage: 'Request time',
      }),
      value: i18n.translate('data.search.searchSource.requestTimeValue', {
        defaultMessage: '{requestTime}ms',
        values: { requestTime: lastRequest.ms },
      }),
      description: i18n.translate('data.search.searchSource.requestTimeDescription', {
        defaultMessage:
          'The time of the request from the browser to Elasticsearch and back. ' +
          'Does not include the time the requested waited in the queue.',
      }),
    };
  }

  return { ...stats, ...getDslResponseInspectorStats(resp) };
}
