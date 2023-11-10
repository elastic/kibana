/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { Criteria, EuiBasicTable, EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import { KnowledgeBaseEntry } from '../../../common/types';

const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntry>> = [
  { field: 'id', name: 'Entry name' },
  { field: '@timestamp', name: 'Created on' },
];

export function KnowledgeBaseTab() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof KnowledgeBaseEntry>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const pageOfItems: KnowledgeBaseEntry[] = [];
  const totalItemCount = 10;

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [3, 5, 8],
  };

  const onTableChange = ({ page, sort }: Criteria<KnowledgeBaseEntry>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  const sorting: EuiTableSortingType<KnowledgeBaseEntry> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiBasicTable<KnowledgeBaseEntry>
      items={pageOfItems}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      onChange={onTableChange}
    />
  );
}
