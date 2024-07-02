/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Criteria } from '@elastic/eui';
import { INITIAL_DEFAULT_PAGE_SIZE, LOCAL_STORAGE_PREFIX } from './constants';
import { createStorage } from './storage';

interface EuiTablePersistProps {
  tableId: string;
  customOnTableChange?: (change: Criteria<any>) => void;
  initialPageSize?: number;
  initialSort?: any;
}

interface PersistData {
  pageSize?: number;
  sort?: {
    field: string | number | symbol;
    direction: 'asc' | 'desc';
  };
}

export const useEuiTablePersist = ({
  tableId,
  customOnTableChange,
  initialPageSize,
  initialSort,
}: EuiTablePersistProps) => {
  const storage = createStorage({
    engine: window.localStorage,
    prefix: LOCAL_STORAGE_PREFIX,
  });

  const storedPersistData: PersistData = storage.get(tableId, undefined);

  const pageSize = storedPersistData?.pageSize || initialPageSize || INITIAL_DEFAULT_PAGE_SIZE;
  const sort = storedPersistData?.sort || initialSort;

  const onTableChange = ({ page, sort: newSort }: Criteria<any>) => {
    if (customOnTableChange) {
      customOnTableChange({ page, sort: newSort });
    }
    const newPersistData: PersistData = {};
    newPersistData.pageSize = page?.size || storedPersistData?.pageSize;
    newPersistData.sort = newSort?.field
      ? newSort
      : newSort?.direction
      ? undefined // If field is an empty string and direction has value, it means sort is removed
      : storedPersistData?.sort; // If both field and direction are undefined, there is no change on sort so use the stored one
    if (page?.size || newSort) {
      storage.set(tableId, newPersistData);
    }
  };

  return { pageSize, sort, onTableChange };
};
