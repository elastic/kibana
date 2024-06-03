/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useMemo } from 'react';
import { DEFAULT_PAGE_SIZE, MAX_GROUPING_LEVELS } from '../constants';

export const useGroupingPersistence = (storage: Storage, groupingId: string) =>
  useMemo(
    () => ({
      getStoragePageSize: (): number[] => {
        const pageSizes = storage.get(`grouping-table-${groupingId}`);
        if (!pageSizes) {
          return Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_SIZE);
        }
        return pageSizes;
      },
      setStoragePageSize: (pageSizes: number[]) => {
        storage.set(`grouping-table-${groupingId}`, pageSizes);
      },
    }),
    [storage, groupingId]
  );
