/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useCallback } from 'react';
import { Criteria } from '@elastic/eui';
import { DEFAULT_INITIAL_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from './constants';
import { createStorage } from './storage';
import { validatePersistData } from './validate_persist_data';
import { PersistData, PropertySort } from './types';

export interface EuiTablePersistProps<T> {
  /** A unique id that will be included in the local storage variable for this table. */
  tableId: string;
  /** (Optional) Specifies a custom onTableChange handler. */
  customOnTableChange?: (change: Criteria<T>) => void;
  /** (Optional) Specifies a custom initial table sorting. */
  initialSort?: PropertySort;
  /** (Optional) Specifies a custom initial page size for the table. Defaults to 50. */
  initialPageSize?: number;
  /** (Optional) Specifies custom page size options for the table.
   * Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS} */
  pageSizeOptions?: number[];
}

/**
 * A hook that stores and retrieves from local storage the table page size and sort criteria.
 * Returns the persisting page size and sort and the onTableChange handler that should be passed
 * as props to an Eui table component.
 */
export const useEuiTablePersist = <T extends object>({
  tableId,
  customOnTableChange,
  initialSort,
  initialPageSize,
  pageSizeOptions,
}: EuiTablePersistProps<T>) => {
  const storage = createStorage();
  const storedPersistData = storage.get(tableId, undefined);

  const { pageSize: storagePageSize, sort: storageSort }: PersistData<T> = validatePersistData(
    storedPersistData,
    pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS
  );

  const [pageSize, setPageSize] = useState<number>(
    storagePageSize ?? initialPageSize ?? DEFAULT_INITIAL_PAGE_SIZE
  );
  const [sort, setSort] = useState<PropertySort | undefined>(storageSort ?? initialSort);
  const sorting = sort && { sort };

  const onTableChange = useCallback(
    (nextValues: Criteria<T>) => {
      if (customOnTableChange) {
        customOnTableChange(nextValues);
      }

      let nextSort: PropertySort | undefined;
      if (nextValues.sort?.field && nextValues.sort?.direction) {
        // Both field and direction are needed for a valid sort criteria
        nextSort = nextValues.sort;
      } else if (!nextValues.sort?.field && !nextValues.sort?.direction) {
        // If both field and direction are undefined, there is no change on sort so use the current one
        nextSort = sort;
      }

      const nextPageSize = nextValues.page?.size ?? pageSize;

      if (nextPageSize !== storagePageSize || nextSort !== storageSort) {
        setPageSize(nextPageSize);
        setSort(nextSort);
        const nextPersistData: PersistData<T> = {
          pageSize: nextPageSize,
          sort: nextSort,
        };
        storage.set(tableId, nextPersistData);
      }
    },
    [customOnTableChange, pageSize, sort, storage, storagePageSize, storageSort, tableId]
  );

  return { pageSize, sorting, onTableChange };
};
