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

interface EuiTablePersistingPageSizeProps {
  tableId: string;
  customOnTableChange?: (change: Criteria<any>) => void;
}

export const useEuiTablePersistingPageSize = ({
  tableId,
  customOnTableChange,
}: EuiTablePersistingPageSizeProps) => {
  const storage = createStorage({
    engine: window.localStorage,
    prefix: LOCAL_STORAGE_PREFIX,
  });

  const pageSize = storage.get(tableId) || INITIAL_DEFAULT_PAGE_SIZE;

  const onTableChange = ({ page, sort }: Criteria<any>) => {
    if (customOnTableChange) {
      customOnTableChange({ page, sort });
    }
    if (page?.size) {
      storage.set(tableId, page.size);
    }
  };

  return { pageSize, onTableChange };
};
