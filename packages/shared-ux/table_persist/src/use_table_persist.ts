/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Criteria } from '@elastic/eui';
import {
  INITIAL_DEFAULT_PAGE_SIZE,
  LOCAL_STORAGE_PREFIX,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from './constants';
import { createStorage } from './storage';
import { validatePersistData } from './validate_persist_data';
import { PersistData } from './types';

interface EuiTablePersistProps {
  /** A unique id that will be included in the local storage variable for this table. */
  tableId: string;
  /** (Optional) If the table has a custom onTableChange, it should be provided here. */
  customOnTableChange?: (change: Criteria<any>) => void;
  /** (Optional) If the table has a custom initial page, it should be provided here.
   * Defaults to {@link INITIAL_DEFAULT_PAGE_SIZE} */
  initialPageSize?: number;
  /** (Optional) If the table has a custom initial sort, it should be provided here. */
  initialSort?: any;
  /** (Optional) If the table has a custom page size options list, it should be provided here.
   * Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS} */
  pageSizeOptions?: number[];
}

/**
 * A hook that stores and retrieves from local storage the table page size and sort criteria.
 * Returns the persisting page size and sort and the onTableChange handler that should be passed
 * as props to an Eui table component.
 */
export const useEuiTablePersist = ({
  tableId,
  customOnTableChange,
  initialPageSize,
  initialSort,
  pageSizeOptions,
}: EuiTablePersistProps) => {
  const storage = createStorage({
    engine: window.localStorage,
    prefix: LOCAL_STORAGE_PREFIX,
  });

  const storedPersistData = storage.get(tableId, undefined);

  const { pageSize: storagePageSize, sort: storageSort }: PersistData = validatePersistData(
    storedPersistData,
    pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS
  );

  const pageSize = storagePageSize ?? initialPageSize ?? INITIAL_DEFAULT_PAGE_SIZE;
  const sort = storageSort ?? initialSort;

  const onTableChange = ({ page, sort: newSort }: Criteria<any>) => {
    if (customOnTableChange) {
      customOnTableChange({ page, sort: newSort });
    }
    const newPersistData: PersistData = {};
    newPersistData.pageSize = page?.size ?? storedPersistData?.pageSize;
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
