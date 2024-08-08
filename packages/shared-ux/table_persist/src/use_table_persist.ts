/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Criteria } from '@elastic/eui';
import {
  DEFAULT_INITIAL_PAGE_SIZE,
  LOCAL_STORAGE_PREFIX,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from './constants';
import { createStorage } from './storage';
import { validatePersistData } from './validate_persist_data';
import { PersistData, SortCriteria } from './types';

interface EuiTablePersistProps {
  /** A unique id that will be included in the local storage variable for this table. */
  tableId: string;
  /** (Optional) Specifies a custom onTableChange handler. */
  customOnTableChange?: (change: Criteria<any>) => void;
  /** (Optional) Specifies a custom initial table sorting. */
  initialSort?: SortCriteria;
  /** (Optional) Specifies a custom initial page size for the table.
   * Defaults to {@link DEFAULT_INITIAL_PAGE_SIZE} */
  initialPageSize: number;
  /** (Optional) Specifies custom page size options for the table.
   * Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS} */
  pageSizeOptions: number[];
}

/**
 * A hook that stores and retrieves from local storage the table page size and sort criteria.
 * Returns the persisting page size and sort and the onTableChange handler that should be passed
 * as props to an Eui table component.
 */
export const useEuiTablePersist = ({
  tableId,
  customOnTableChange,
  initialSort,
  initialPageSize = DEFAULT_INITIAL_PAGE_SIZE,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: EuiTablePersistProps) => {
  const storage = createStorage({
    engine: window.localStorage,
    prefix: LOCAL_STORAGE_PREFIX,
  });

  const storedPersistData = storage.get(tableId, undefined);

  const { pageSize: storagePageSize, sort: storageSort }: PersistData = validatePersistData(
    storedPersistData,
    pageSizeOptions
  );

  const pageSize = storagePageSize ?? initialPageSize;
  const sort = storageSort ?? initialSort;

  const onTableChange = ({ page, sort: newSort }: Criteria<any>) => {
    if (customOnTableChange) {
      customOnTableChange({ page, sort: newSort });
    }
    const newPersistData: PersistData = {};
    newPersistData.pageSize = page?.size ?? storagePageSize;
    newPersistData.sort = newSort?.field
      ? newSort
      : newSort?.direction
      ? undefined // If field is an empty string and direction has value, it means sort is removed
      : storageSort; // If both field and direction are undefined, there is no change on sort so use the stored one
    if (newPersistData.pageSize !== storagePageSize || newPersistData.sort !== storageSort) {
      storage.set(tableId, newPersistData);
    }
  };

  return { pageSize, sort, onTableChange };
};
