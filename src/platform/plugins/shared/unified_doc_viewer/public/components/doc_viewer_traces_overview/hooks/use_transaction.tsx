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
import { getUnifiedDocViewerServices } from '../../../plugin';

interface UseTransactionPrams {
  transactionId?: string;
  indexPattern: string;
}

interface GetTransactionParams {
  transactionId: string;
  indexPattern: string;
  data: DataPublicPluginStart;
}

async function getTransactionData({ transactionId, indexPattern, data }: GetTransactionParams) {
  return lastValueFrom(
    data.search.search({
      params: {
        index: indexPattern,
        size: 1,
        body: {
          timeout: '20s',
          query: {
            bool: {
              must: [
                {
                  match: {
                    'transaction.id': transactionId,
                  },
                },
                {
                  exists: {
                    field: 'transaction.name',
                  },
                },
                {
                  term: {
                    'processor.event': 'transaction',
                  },
                },
              ],
            },
          },
        },
      },
    })
  );
}

const useTransaction = ({ transactionId, indexPattern }: UseTransactionPrams) => {
  const { data } = getUnifiedDocViewerServices();
  const [transaction, setTransaction] = useState<{ [key: string]: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (transactionId) {
        try {
          setLoading(true);
          const result = await getTransactionData({ transactionId, indexPattern, data });

          const resultTransactionName = result.rawResponse.hits.hits.find(
            (hit) => hit._source.transaction?.name
          )?._source.transaction.name;

          setTransaction(resultTransactionName ? { name: resultTransactionName } : null);
        } catch (err) {
          setTransaction({ name: '' });
        } finally {
          setLoading(false);
        }
      } else {
        setTransaction({ name: '' });
        setLoading(false);
      }
    };

    fetchData();
  }, [data, indexPattern, transactionId]);

  return { loading, transaction };
};

export const [TransactionProvider, useTransactionContext] = createContainer(useTransaction);
