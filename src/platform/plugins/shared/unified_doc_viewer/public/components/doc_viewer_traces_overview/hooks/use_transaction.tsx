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

interface UseTransactionDeps {
  traceId: string;
  indexPattern: string;
}

async function getTransactionData(
  traceId: string,
  indexPattern: string,
  data: DataPublicPluginStart
) {
  return lastValueFrom(
    data.search.search({
      params: {
        index: indexPattern,
        size: 10,
        track_total_hits: true,
        body: {
          timeout: '20s',
          query: {
            bool: {
              must: [
                {
                  match: {
                    'trace.id': traceId,
                  },
                },
                {
                  exists: {
                    field: 'transaction.name',
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

const useTransaction = ({ traceId, indexPattern }: UseTransactionDeps) => {
  const { data } = getUnifiedDocViewerServices();
  const [transaction, setTransaction] = useState<{ [key: string]: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getTransactionData(traceId, indexPattern, data);

        const resultTransactionName = result.rawResponse.hits.hits.find(
          (hit) => hit._source.transaction?.name
        )?._source.transaction.name;

        setTransaction(resultTransactionName ? { name: resultTransactionName } : null);
      } catch (err) {
        setTransaction({ name: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [traceId, data, indexPattern]);

  return { loading, transaction };
};

export const [TransactionProvider, useTransactionContext] = createContainer(useTransaction);
