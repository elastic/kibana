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
  id: string;
}

interface GetLogParams {
  id: string;
  indexPattern: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

async function fetchLogDocument({ id, indexPattern, data, signal }: GetLogParams) {
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
                _id: id,
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );
}

export function useFetchLog({ id }: Props) {
  const { indexes } = useDataSourcesContext();
  const { data, core } = getUnifiedDocViewerServices();
  const [loading, setLoading] = useState(true);
  const [logDoc, setLogDoc] = useState<Record<PropertyKey, any> | null>(null);
  const [index, setIndex] = useState<string | null>(null);

  const indexPattern = indexes.logs;
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = indexPattern
          ? await fetchLogDocument({ id, indexPattern, data, signal })
          : undefined;
        setIndex(result?.rawResponse.hits.hits[0]?._index ?? null);
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
  }, [core.notifications.toasts, data, id, indexPattern]);

  return { loading, logDoc, index };
}
