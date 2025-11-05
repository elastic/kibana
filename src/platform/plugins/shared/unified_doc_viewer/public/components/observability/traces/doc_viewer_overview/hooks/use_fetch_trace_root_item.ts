/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import createContainer from 'constate';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { TraceRootItem } from '@kbn/apm-types';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

interface UseFetchTraceRootItemParams {
  traceId: string;
}

const useFetchTraceRootItem = ({ traceId }: UseFetchTraceRootItemParams) => {
  const { data, discoverShared } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  const fetchRootItemByTraceId = discoverShared.features.registry.getById(
    'observability-traces-fetch-root-item-by-trace-id'
  );

  const { loading, error, value } = useAbortableAsync<TraceRootItem | undefined>(
    async ({ signal }) => {
      if (!fetchRootItemByTraceId || !traceId) {
        return undefined;
      }

      return fetchRootItemByTraceId.fetchRootItemByTraceId(
        {
          traceId,
          start: timeFilter.from,
          end: timeFilter.to,
        },
        signal
      );
    },
    [fetchRootItemByTraceId, traceId, timeFilter.from, timeFilter.to]
  );

  return {
    loading,
    error,
    item: value,
  };
};

export const [TraceRootItemProvider, useFetchTraceRootItemContext] =
  createContainer(useFetchTraceRootItem);
