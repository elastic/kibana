/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { ESQLRequestStats } from '@kbn/esql-types';
import { isEqual } from 'lodash';

export function useESQLRequestStats(
  isEsqlMode: boolean,
  requestAdapter?: RequestAdapter
): ESQLRequestStats | undefined {
  const [requestStats, setRequestStats] = useState<ESQLRequestStats | undefined>(undefined);

  const handleRequestAdapterChange = useCallback(() => {
    const requests = requestAdapter?.getRequests() ?? [];

    if (requests.length > 0) {
      const latestRequest = requests[requests.length - 1];
      const stats = latestRequest.stats;
      if (stats) {
        const updatedStats = {
          durationInMs: stats.queryTime.value,
          totalDocumentsProcessed: stats.documentsProcessed.value,
          lastRunAt: stats.requestTimestamp.value,
        };
        setRequestStats((currentStats) => {
          if (!isEqual(currentStats, updatedStats)) {
            return updatedStats;
          }
          return currentStats;
        });
      }
    }
  }, [requestAdapter]);

  useEffect(() => {
    if (!isEsqlMode || !requestAdapter) {
      return;
    }

    requestAdapter.on('change', handleRequestAdapterChange);

    return () => {
      requestAdapter.off('change', handleRequestAdapterChange);
    };
  }, [handleRequestAdapterChange, isEsqlMode, requestAdapter]);

  return requestStats;
}
