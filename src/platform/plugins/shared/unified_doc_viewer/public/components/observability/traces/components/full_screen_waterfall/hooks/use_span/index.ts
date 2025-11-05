/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

interface UseSpanParams {
  spanId: string;
  traceId: string;
}

export const useSpan = ({ spanId, traceId }: UseSpanParams) => {
  const { data, core, discoverShared } = getUnifiedDocViewerServices();

  const fetchSpanFeature = discoverShared.features.registry.getById(
    'observability-traces-fetch-span'
  );

  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      if (!fetchSpanFeature?.fetchSpan || !traceId || !spanId) {
        return undefined;
      }

      return fetchSpanFeature.fetchSpan(
        {
          traceId,
          spanId,
        },
        signal
      );
    },
    [fetchSpanFeature, traceId, spanId]
  );

  return {
    loading,
    error,
    span: value,
  };
};
