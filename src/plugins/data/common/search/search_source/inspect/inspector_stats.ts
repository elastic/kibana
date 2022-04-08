/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This function collects statistics from a SearchSource and a response
 * for the usage in the inspector stats panel. Pass in a searchSource and a response
 * and the returned object can be passed to the `stats` method of the request
 * logger.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { ISearchSource } from 'src/plugins/data/public';
import type { RequestStatistics } from 'src/plugins/inspector/common';

/** @public */
export function getRequestInspectorStats(searchSource: ISearchSource) {
  const stats: RequestStatistics = {};
  const index = searchSource.getField('index');

  if (index) {
    stats.indexPattern = {
      label: i18n.translate('data.search.searchSource.dataViewLabel', {
        defaultMessage: 'Data view',
      }),
      value: index.title,
      description: i18n.translate('data.search.searchSource.dataViewDescription', {
        defaultMessage: 'The data view that was queried.',
      }),
    };
    stats.indexPatternId = {
      label: i18n.translate('data.search.searchSource.dataViewIdLabel', {
        defaultMessage: 'Data view ID',
      }),
      value: index.id!,
      description: i18n.translate('data.search.searchSource.indexPatternIdDescription', {
        defaultMessage: 'The ID in the {kibanaIndexPattern} index.',
        values: { kibanaIndexPattern: '.kibana' },
      }),
    };
  }

  return stats;
}

/** @public */
export function getResponseInspectorStats(
  resp?: estypes.SearchResponse<unknown>,
  searchSource?: ISearchSource
) {
  const lastRequest =
    searchSource?.history && searchSource.history[searchSource.history.length - 1];
  const stats: RequestStatistics = {};

  if (resp && resp.took) {
    stats.queryTime = {
      label: i18n.translate('data.search.searchSource.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('data.search.searchSource.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: resp.took },
      }),
      description: i18n.translate('data.search.searchSource.queryTimeDescription', {
        defaultMessage:
          'The time it took to process the query. ' +
          'Does not include the time to send the request or parse it in the browser.',
      }),
    };
  }

  if (resp && resp.hits?.total !== undefined) {
    let value: string | undefined;
    // TODO remove case where total is number when legacyHitsTotal is removed
    if (typeof resp.hits.total === 'number') {
      value = `${resp.hits.total}`;
    } else {
      const total = resp.hits.total as { relation: string; value: number };
      value = total.relation === 'eq' ? `${total.value}` : `> ${total.value}`;
    }
    stats.hitsTotal = {
      label: i18n.translate('data.search.searchSource.hitsTotalLabel', {
        defaultMessage: 'Hits (total)',
      }),
      value,
      description: i18n.translate('data.search.searchSource.hitsTotalDescription', {
        defaultMessage: 'The number of documents that match the query.',
      }),
    };
  }

  if (resp && resp.hits) {
    stats.hits = {
      label: i18n.translate('data.search.searchSource.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${resp.hits.hits.length}`,
      description: i18n.translate('data.search.searchSource.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

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

  return stats;
}
