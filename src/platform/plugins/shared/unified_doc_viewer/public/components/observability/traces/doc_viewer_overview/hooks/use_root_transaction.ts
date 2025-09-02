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
import {
  PARENT_ID_FIELD,
  SERVICE_NAME_FIELD,
  SPAN_ID_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_ID_FIELD,
} from '@kbn/discover-utils';
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

async function getRootTransaction({
  data,
  signal,
  traceId,
  indexPattern,
}: GetRootTransactionParams) {
  return lastValueFrom(
    data.search.search(
      {
        params: {
          index: indexPattern,
          size: 1,
          body: {
            timeout: '20s',
            fields: [
              TRANSACTION_DURATION_FIELD,
              SPAN_ID_FIELD,
              SERVICE_NAME_FIELD,
              TRANSACTION_ID_FIELD,
            ],
            query: {
              bool: {
                should: [
                  {
                    constant_score: {
                      filter: {
                        bool: {
                          must_not: { exists: { field: PARENT_ID_FIELD } },
                        },
                      },
                    },
                  },
                ],
                filter: [{ term: { [TRACE_ID_FIELD]: traceId } }],
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );
}

export interface Transaction {
  duration: number;
  [SPAN_ID_FIELD]: string;
  [TRANSACTION_ID_FIELD]: string;
  [SERVICE_NAME_FIELD]: string;
}

const useRootTransaction = ({ traceId }: UseRootTransactionParams) => {
  const { indexes } = useDataSourcesContext();
  const indexPattern = indexes.apm.traces;
  const { core, data } = getUnifiedDocViewerServices();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!traceId) {
      setTransaction(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = indexPattern
          ? await getRootTransaction({ data, signal, traceId, indexPattern })
          : undefined;

        const fields = result?.rawResponse.hits.hits[0]?.fields;
        const transactionDuration = fields?.[TRANSACTION_DURATION_FIELD];
        const spanId = fields?.[SPAN_ID_FIELD];
        const transactionId = fields?.[TRANSACTION_ID_FIELD];
        const serviceName = fields?.[SERVICE_NAME_FIELD];

        setTransaction({
          duration: transactionDuration,
          [SPAN_ID_FIELD]: spanId,
          [TRANSACTION_ID_FIELD]: transactionId,
          [SERVICE_NAME_FIELD]: serviceName,
        });
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate(
              'unifiedDocViewer.docViewerSpanOverview.useRootTransaction.error',
              {
                defaultMessage: 'An error occurred while fetching the transaction',
              }
            ),
            text: error.message,
          });
          setTransaction(null);
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
  return { loading, transaction };
};

export const [RootTransactionProvider, useRootTransactionContext] =
  createContainer(useRootTransaction);
