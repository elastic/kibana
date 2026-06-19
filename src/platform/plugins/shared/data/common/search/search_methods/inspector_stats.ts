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

import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';

/** @public */
export function getEsqlInspectorStats(resp?: estypes.EsqlAsyncQueryResponse): RequestStatistics {
  const stats: RequestStatistics = {};

  if (resp?.values) {
    stats.hits = {
      label: i18n.translate('data.search.es_search.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${resp.values.length}`,
      description: i18n.translate('data.search.es_search.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

  if (resp?.took) {
    stats.queryTime = {
      label: i18n.translate('data.search.es_search.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('data.search.es_search.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: resp.took },
      }),
      description: i18n.translate('data.search.es_search.queryTimeDescription', {
        defaultMessage:
          'The time it took to process the query. ' +
          'Does not include the time to send the request or parse it in the browser.',
      }),
    };
  }

  if (resp && 'documents_found' in resp) {
    stats.documentsProcessed = {
      label: i18n.translate('data.search.es_search.documentsProcessedLabel', {
        defaultMessage: 'Documents processed',
      }),
      value: `${resp.documents_found}`,
      description: i18n.translate('data.search.es_search.documentsProcessedDescription', {
        defaultMessage: 'The number of documents processed by the query.',
      }),
    };
  }

  return stats;
}

/** @public */
export function getSqlInspectorStats(
  resp?: estypes.SqlQueryResponse,
  took?: number
): RequestStatistics {
  const stats: RequestStatistics = {};

  if (resp?.rows) {
    stats.hits = {
      label: i18n.translate('data.search.es_search.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${resp.rows.length}`,
      description: i18n.translate('data.search.es_search.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

  if (took !== undefined) {
    stats.queryTime = {
      label: i18n.translate('data.search.es_search.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('data.search.es_search.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: took },
      }),
      description: i18n.translate('data.search.es_search.queryTimeDescription', {
        defaultMessage:
          'The time it took to process the query. ' +
          'Does not include the time to send the request or parse it in the browser.',
      }),
    };
  }

  return stats;
}

/** @public */
export function getDslRequestInspectorStats(dataView?: AbstractDataView): RequestStatistics {
  const stats: RequestStatistics = {};

  if (dataView) {
    stats.indexPattern = {
      label: i18n.translate('data.search.searchSource.dataViewLabel', {
        defaultMessage: 'Data view',
      }),
      value: dataView.getIndexPattern(),
      description: i18n.translate('data.search.searchSource.dataViewDescription', {
        defaultMessage: 'The data view that was queried.',
      }),
    };
    stats.indexPatternId = {
      label: i18n.translate('data.search.searchSource.dataViewIdLabel', {
        defaultMessage: 'Data view ID',
      }),
      value: dataView.id!,
      description: i18n.translate('data.search.searchSource.indexPatternIdDescription', {
        defaultMessage: 'The ID in the {kibanaIndexPattern} index.',
        values: { kibanaIndexPattern: '.kibana' },
      }),
    };
  }

  return stats;
}

/** @public */
export function getDslResponseInspectorStats(resp?: estypes.SearchResponse<unknown>) {
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

  return stats;
}
