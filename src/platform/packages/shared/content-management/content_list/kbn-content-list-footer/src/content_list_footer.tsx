/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useContentListPagination } from '@kbn/content-list-provider';
import { PaginationComponent } from './pagination_component';

/**
 * Props for the {@link ContentListFooter} component.
 */
export interface ContentListFooterProps {
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Footer component for content lists.
 *
 * Renders pagination controls that match the layout of `EuiBasicTable`'s
 * `PaginationBar` ("Rows per page" on the left, page buttons on the right).
 *
 * When pagination is not enabled in the provider, renders nothing.
 *
 * @example
 * ```tsx
 * <ContentListProvider id="my-list" ...>
 *   <ContentListTable />
 *   <ContentListFooter />
 * </ContentListProvider>
 * ```
 */
export const ContentListFooter = ({
  'data-test-subj': dataTestSubj = 'contentListFooter',
}: ContentListFooterProps) => {
  const {
    isSupported,
    pageIndex,
    pageSize,
    totalItems,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
  } = useContentListPagination();

  // Early exit if pagination is disabled. The `totalItems` guard is handled by
  // `PaginationComponent` itself, so we only check `isSupported` here.
  if (!isSupported) {
    return null;
  }

  return (
    <div data-test-subj={dataTestSubj}>
      <PaginationComponent
        {...{ pageIndex, pageSize, totalItems, pageSizeOptions }}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};
