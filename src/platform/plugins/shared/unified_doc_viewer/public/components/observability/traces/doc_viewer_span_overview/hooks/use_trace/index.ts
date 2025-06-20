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
  OTEL_DURATION,
  PARENT_ID_FIELD,
  PROCESSOR_EVENT_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_NAME_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';

interface UseTransactionPrams {
  traceId?: string;
  indexPattern: string;
}

interface GetTransactionParams {
  traceId: string;
  indexPattern: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

async function getTraceData({ traceId, indexPattern, data, signal }: GetTransactionParams) {
  return lastValueFrom(
    data.search.search(
      {
        params: {
          index: indexPattern,
          size: 1,
          body: {
            timeout: '20s',
            fields: [
              TRANSACTION_NAME_FIELD,
              TRANSACTION_DURATION_FIELD,
              SPAN_NAME_FIELD,
              SPAN_DURATION_FIELD,
              OTEL_DURATION,
            ],
            query: {
              bool: {
                must: [
                  {
                    term: {
                      [TRACE_ID_FIELD]: traceId,
                    },
                  },
                ],
                should: [
                  {
                    term: {
                      [PROCESSOR_EVENT_FIELD]: 'transaction',
                    },
                  },
                  {
                    bool: {
                      must_not: [
                        { exists: { field: PROCESSOR_EVENT_FIELD } },
                        { exists: { field: PARENT_ID_FIELD } },
                        { exists: { field: 'parent_span_id' } },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );
}

export interface Trace {
  name: string;
  duration: number;
}

const useTrace = ({ traceId, indexPattern }: UseTransactionPrams) => {
  const { data, core } = getUnifiedDocViewerServices();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!traceId) {
      setTrace(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getTraceData({ traceId, indexPattern, data, signal });

        const fields = result.rawResponse.hits.hits[0]?.fields;
        const name = fields?.[TRANSACTION_NAME_FIELD] || fields?.[SPAN_NAME_FIELD];
        const duration = resolveDuration(fields);

        if (name && duration) {
          setTrace({
            name,
            duration,
          });
        }
      } catch (err) {
        if (!signal.aborted) {
          const error = err as Error;
          core.notifications.toasts.addDanger({
            title: i18n.translate('unifiedDocViewer.docViewerSpanOverview.useTrace.error', {
              defaultMessage: 'An error occurred while fetching the trace',
            }),
            text: error.message,
          });
          setTrace(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return function onUnmount() {
      controller.abort();
    };
  }, [core.notifications.toasts, data, indexPattern, traceId]);

  return { loading, trace };
};

export const [TraceProvider, useTraceContext] = createContainer(useTrace);

function resolveDuration(fields?: Record<string, any>): number | null {
  const duration = fields?.[TRANSACTION_DURATION_FIELD];

  if (duration) {
    return duration;
  }

  const otelDuration = fields?.[OTEL_DURATION];

  if (otelDuration) {
    return otelDuration * 0.001;
  }

  return null;
}
