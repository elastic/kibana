/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { SPAN_ID_FIELD, TRACE_ID_FIELD } from '@kbn/discover-utils';
import { useState, useEffect } from 'react';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';

interface UseSpanParams {
  spanId: string;
  traceId: string;
}

interface GetTransactionParams {
  spanId: string;
  indexPattern: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
  traceId: string;
}

async function getSpanData({ spanId, indexPattern, data, traceId, signal }: GetTransactionParams) {
  return lastValueFrom(
    data.search.search(
      {
        params: {
          index: indexPattern,
          size: 1,
          body: {
            timeout: '20s',
            fields: [
              {
                field: '*',
                include_unmapped: true,
              },
            ],
            query: {
              bool: {
                filter: [
                  { term: { [TRACE_ID_FIELD]: traceId } },
                  { term: { [SPAN_ID_FIELD]: spanId } },
                ],
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );
}

export const useSpan = ({ spanId, traceId }: UseSpanParams) => {
  const { indexes } = useDataSourcesContext();
  const indexPattern = indexes.apm.traces;
  const { data, core } = getUnifiedDocViewerServices();
  const [span, setSpan] = useState<Record<PropertyKey, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = indexPattern
          ? await getSpanData({ spanId, indexPattern, data, signal, traceId })
          : undefined;
        setSpan(result?.rawResponse.hits.hits[0]?.fields ?? null);
        setDocId(result?.rawResponse.hits.hits[0]?._id ?? null);
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate('unifiedDocViewer.fullScreenWaterfall.useSpan.error', {
              defaultMessage: 'An error occurred while fetching the span',
            }),
            text: error.message,
          });
          setSpan(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return function onUnmount() {
      controller.abort();
    };
  }, [core.notifications.toasts, data, indexPattern, spanId, traceId]);

  return { loading, span, docId };
};
