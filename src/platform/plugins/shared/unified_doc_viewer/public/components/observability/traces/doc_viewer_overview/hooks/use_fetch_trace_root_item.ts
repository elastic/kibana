/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import createContainer from 'constate';
import { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { DURATION, PARENT_ID, SPAN_DURATION, TRACE_ID, TRANSACTION_DURATION } from '@kbn/apm-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { useDataSourcesContext } from '../../hooks/use_data_sources';

interface UseRootTransactionParams {
  traceId: string;
}

interface GetRootTransactionParams {
  data: DataPublicPluginStart;
  signal: AbortSignal;
  traceId: string;
  indexPattern: string;
}

async function getTraceRootItem({ data, signal, traceId, indexPattern }: GetRootTransactionParams) {
  return lastValueFrom(
    data.search.search(
      {
        params: {
          index: indexPattern,
          size: 1,
          body: {
            timeout: '20s',
            fields: [TRANSACTION_DURATION, SPAN_DURATION, DURATION],
            query: {
              bool: {
                should: [
                  {
                    constant_score: {
                      filter: {
                        bool: {
                          must_not: { exists: { field: PARENT_ID } },
                        },
                      },
                    },
                  },
                ],
                filter: [{ term: { [TRACE_ID]: traceId } }],
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );
}

export interface Span {
  duration: number;
}

const useFetchTraceRootItem = ({ traceId }: UseRootTransactionParams) => {
  const { indexes } = useDataSourcesContext();
  const indexPattern = indexes.apm.traces;
  const { core, data } = getUnifiedDocViewerServices();
  const [item, setItem] = useState<Span | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!traceId) {
      setItem(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = indexPattern
          ? await getTraceRootItem({ data, signal, traceId, indexPattern })
          : undefined;

        const fields = result?.rawResponse.hits.hits[0]?.fields;
        const itemDuration =
          fields?.[TRANSACTION_DURATION] ?? fields?.[SPAN_DURATION] ?? fields?.[DURATION]! * 0.001;

        setItem({
          duration: itemDuration,
        });
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate(
              'unifiedDocViewer.docViewerTraceOverview.useFetchTraceRootItem.error',
              {
                defaultMessage: 'An error occurred while fetching the root item of the trace',
              }
            ),
            text: error.message,
          });
          setItem(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return function onUnmount() {
      controller.abort();
    };
  }, [data, core.notifications.toasts, traceId, indexPattern]);
  return { loading, item };
};

export const [TraceRootItemProvider, useFetchTraceRootItemContext] =
  createContainer(useFetchTraceRootItem);
