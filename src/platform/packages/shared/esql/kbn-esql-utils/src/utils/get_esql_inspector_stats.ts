/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';

interface EsqlResponseForStats {
  values: unknown[];
  took?: number;
  documents_found?: number;
}

/** Builds the Inspector request statistics (hits, query time, documents processed) for an ES|QL response. */
export const getEsqlInspectorStats = (response: EsqlResponseForStats): RequestStatistics => {
  const { values, took, documents_found: documentsFound } = response;

  return {
    hits: {
      label: i18n.translate('esqlUtils.inspector.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${values.length}`,
      description: i18n.translate('esqlUtils.inspector.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    },
    ...(took !== undefined && {
      queryTime: {
        label: i18n.translate('esqlUtils.inspector.queryTimeLabel', {
          defaultMessage: 'Query time',
        }),
        value: i18n.translate('esqlUtils.inspector.queryTimeValue', {
          defaultMessage: '{queryTime}ms',
          values: { queryTime: took },
        }),
        description: i18n.translate('esqlUtils.inspector.queryTimeDescription', {
          defaultMessage:
            'The time it took to process the query. Does not include the time to send the request or parse it in the browser.',
        }),
      },
    }),
    ...(documentsFound !== undefined && {
      documentsProcessed: {
        label: i18n.translate('esqlUtils.inspector.documentsProcessedLabel', {
          defaultMessage: 'Documents processed',
        }),
        value: documentsFound,
        description: i18n.translate('esqlUtils.inspector.documentsProcessedDescription', {
          defaultMessage: 'The number of documents processed by the query.',
        }),
      },
    }),
  };
};
