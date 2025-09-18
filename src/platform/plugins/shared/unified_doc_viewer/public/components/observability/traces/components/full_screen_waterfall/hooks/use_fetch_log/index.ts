/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

interface Props {
  errorDocId: string;
}

interface GetTransactionParams {
  docId: string;
  indexPattern: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

async function fetchLogDocument({ docId, indexPattern, data, signal }: GetTransactionParams) {
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
              term: {
                _id: docId,
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );
}

export function useFetchLog({ errorDocId }: Props) {
  const { indexes } = useDataSourcesContext();
  const { data, core } = getUnifiedDocViewerServices();
  const [loading, setLoading] = useState(true);
  const [logDoc, setLogDoc] = useState<Record<PropertyKey, any> | null>(null);

  const indexPattern = indexes.logs;
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = indexPattern
          ? await fetchLogDocument({ docId: errorDocId, indexPattern, data, signal })
          : undefined;
        setLogDoc(result?.rawResponse.hits.hits[0]?.fields ?? null);
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate('unifiedDocViewer.fullScreenWaterfall.logDocument.error', {
              defaultMessage: 'An error occurred while fetching the log document',
            }),
            text: error.message,
          });
          setLogDoc(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return function onUnmount() {
      controller.abort();
    };
  }, [core.notifications.toasts, data, errorDocId, indexPattern]);

  return { loading, logDoc };
}
