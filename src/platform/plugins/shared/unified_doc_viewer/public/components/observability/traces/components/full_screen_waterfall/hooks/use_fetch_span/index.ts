/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

interface UseFetchSpanParams {
  spanId: string;
  traceId: string;
}

export const useFetchSpan = ({ spanId, traceId }: UseFetchSpanParams) => {
  const { discoverShared, core, data } = getUnifiedDocViewerServices();

  const fetchSpanFeature = discoverShared.features.registry.getById(
    'observability-traces-fetch-span'
  );

  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      if (!fetchSpanFeature?.fetchSpan || !traceId || !spanId) {
        return undefined;
      }

      const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

      return fetchSpanFeature.fetchSpan(
        {
          traceId,
          spanId,
          start: timeFilter.from,
          end: timeFilter.to,
        },
        signal
      );
    },
    [fetchSpanFeature, traceId, spanId]
  );

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.notifications.toasts.addDanger({
        title: i18n.translate('unifiedDocViewer.fullScreenWaterfall.spanDocument.error', {
          defaultMessage: 'An error occurred while fetching the span document',
        }),
        text: errorMessage,
      });
    }
  }, [error, core.notifications.toasts]);

  return {
    loading,
    error,
    span: value,
  };
};
