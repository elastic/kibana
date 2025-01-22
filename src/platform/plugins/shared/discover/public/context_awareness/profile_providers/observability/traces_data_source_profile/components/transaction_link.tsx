/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { lastValueFrom } from 'rxjs';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';

interface TransactionLinkProps {
  traceId: string;
  serviceName: string;
  transactionName?: string;
  indexPattern?: string;
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
                  terms: {
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

export const TransactionLink: React.FC<TransactionLinkProps> = ({
  traceId,
  transactionName,
  serviceName,
  indexPattern,
}: TransactionLinkProps) => {
  const { share, data } = useDiscoverServices();

  const transactionByNameLocator = share?.url.locators.get<{
    transactionName: string;
    serviceName: string;
  }>('TransactionDetailsByNameLocator');

  const [fetchedTransactionName, setFetchedTransactionName] = useState<string>(
    transactionName ?? ''
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (indexPattern && !transactionName) {
      setLoading(true);
      const fetchData = async () => {
        try {
          const result = await getTransactionData(traceId, indexPattern, data);

          const resultTransactionName = result.rawResponse.hits.hits.find(
            (hit) => hit._source.transaction?.name
          )?._source.transaction.name;

          if (resultTransactionName) {
            setFetchedTransactionName(resultTransactionName);
          }
        } catch (err) {
          setFetchedTransactionName('Root transaction');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [traceId, indexPattern, transactionName, data]);

  if (loading) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <EuiLink
      href={transactionByNameLocator?.getRedirectUrl({
        transactionName: transactionName ?? fetchedTransactionName,
        serviceName,
      })}
      target="_blank"
    >
      {transactionName ?? fetchedTransactionName}
    </EuiLink>
  );
};
