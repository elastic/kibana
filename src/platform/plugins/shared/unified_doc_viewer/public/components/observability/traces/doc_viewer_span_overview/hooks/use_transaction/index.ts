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
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import {
  PROCESSOR_EVENT_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_ID_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';

interface UseTransactionPrams {
  transactionId?: string;
  indexPattern: string;
}

interface GetTransactionParams {
  transactionId: string;
  indexPattern: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

async function getTransactionData({
  transactionId,
  indexPattern,
  data,
  signal,
}: GetTransactionParams) {
  return lastValueFrom(
    data.search.search(
      {
        params: {
          index: indexPattern,
          size: 1,
          body: {
            timeout: '20s',
            fields: [TRANSACTION_NAME_FIELD, TRANSACTION_DURATION_FIELD],
            query: {
              bool: {
                must: [
                  {
                    term: {
                      [TRANSACTION_ID_FIELD]: transactionId,
                    },
                  },
                  {
                    term: {
                      [PROCESSOR_EVENT_FIELD]: 'transaction',
                    },
                  },
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

export interface Transaction {
  name: string;
  duration: number;
}

const useTransaction = ({ transactionId, indexPattern }: UseTransactionPrams) => {
  const { data, core } = getUnifiedDocViewerServices();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!transactionId) {
      setTransaction(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getTransactionData({ transactionId, indexPattern, data, signal });

        const fields = result.rawResponse.hits.hits[0]?.fields;
        const transactionName = fields?.[TRANSACTION_NAME_FIELD];
        const transactionDuration = fields?.[TRANSACTION_DURATION_FIELD];

        setTransaction({
          name: transactionName || null,
          duration: transactionDuration || null,
        });
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate('unifiedDocViewer.docViewerSpanOverview.useTransaction.error', {
              defaultMessage: 'An error occurred while fetching the transaction',
            }),
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
  }, [core.notifications.toasts, data, indexPattern, transactionId]);

  return { loading, transaction };
};

export const [TransactionProvider, useTransactionContext] = createContainer(useTransaction);
