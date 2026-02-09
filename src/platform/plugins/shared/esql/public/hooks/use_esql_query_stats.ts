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
import type { ESQLQueryStats } from '@kbn/esql-types';
import { isEqual } from 'lodash';

export function useESQLQueryStats(
  isEsqlMode: boolean,
  requestAdapter?: RequestAdapter
): ESQLQueryStats | undefined {
  const [queryStats, setQueryStats] = useState<ESQLQueryStats | undefined>(undefined);

  const handleRequestAdapterChange = useCallback(() => {
    const requests = requestAdapter?.getRequests() ?? [];

    if (requests.length > 0) {
      const latestRequest = requests[requests.length - 1];
      const stats = latestRequest.stats;
      if (stats) {
        const updatedStats = {
          durationInMs: stats.queryTime?.value,
          totalDocumentsProcessed: stats.documentsProcessed?.value,
        };
        setQueryStats((currentStats: ESQLQueryStats | undefined) => {
          if (!isEqual(currentStats, updatedStats)) {
            return updatedStats;
          }
          return currentStats;
        });
      } else {
        setQueryStats(undefined);
      }
    } else {
      setQueryStats(undefined);
    }
  }, [requestAdapter]);

  useEffect(() => {
    if (!isEsqlMode || !requestAdapter) {
      return;
    }

    handleRequestAdapterChange();

    requestAdapter.on('change', handleRequestAdapterChange);

    return () => {
      requestAdapter.off('change', handleRequestAdapterChange);
    };
  }, [handleRequestAdapterChange, isEsqlMode, requestAdapter]);

  return queryStats;
}
