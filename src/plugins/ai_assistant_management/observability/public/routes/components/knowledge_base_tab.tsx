/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiScreenReaderOnly,
  EuiTableSortingType,
  EuiTitle,
} from '@elastic/eui';
import { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { capitalize } from 'lodash';
import {
  KnowledgeBaseEntryCategory,
  useGetKnowledgeBaseEntriesPerCategory,
} from '../../hooks/use_get_knowledge_base_entries_per_category';

const columnsEntries: Array<EuiBasicTableColumn<KnowledgeBaseEntry>> = [
  {
    field: '@timestamp',
    name: 'Date created',
    sortable: true,
  },
  {
    field: 'id',
    name: 'ID',
    sortable: true,
  },
];

export function KnowledgeBaseTab() {
  const { categories = [] } = useGetKnowledgeBaseEntriesPerCategory();

  const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseEntryCategory | null>(null);

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntryCategory>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('aiAssistantManagement.span.expandRowsLabel', {
              defaultMessage: 'Expand rows',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (category: KnowledgeBaseEntryCategory) => {
        return (
          <EuiButtonIcon
            onClick={() => setSelectedCategory(category)}
            aria-label={
              category.categoryName === selectedCategory?.categoryName ? 'Collapse' : 'Expand'
            }
            iconType={
              category.categoryName === selectedCategory?.categoryName ? 'minimize' : 'expand'
            }
          />
        );
      },
    },
    {
      field: 'categoryName',
      name: 'Category',
      sortable: true,
    },
    {
      field: 'entries',
      name: 'Number of entries',
      sortable: true,
      render: (entries: KnowledgeBaseEntryCategory['entries']) => (
        <EuiBadge>{entries.length}</EuiBadge>
      ),
    },
    {
      name: 'Type',
      render: (category: KnowledgeBaseEntryCategory) => {
        return (
          <div>
            {i18n.translate('aiAssistantManagement.columns.div.helloLabel', {
              defaultMessage: 'hello',
            })}
          </div>
        );
      },
    },
  ];

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof KnowledgeBaseEntryCategory>('categoryName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const pageOfItems = categories;
  const totalItemCount = 10;

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [3, 5, 8],
  };

  const onTableChange = ({ page, sort }: Criteria<KnowledgeBaseEntryCategory>) => {
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

  const sorting: EuiTableSortingType<KnowledgeBaseEntryCategory> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFieldSearch
                fullWidth
                placeholder={i18n.translate(
                  'aiAssistantManagement.knowledgeBaseTab.euiFieldSearch.searchThisLabel',
                  { defaultMessage: 'Search this' }
                )}
                value={''}
                onChange={(e) => {}}
                isClearable
                aria-label={i18n.translate(
                  'aiAssistantManagement.knowledgeBaseTab.euiFieldSearch.useAriaLabelsWhenLabel',
                  { defaultMessage: 'Use aria labels when no actual label is in use' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton>
                {i18n.translate('aiAssistantManagement.knowledgeBaseTab.newEntryButtonLabel', {
                  defaultMessage: 'New entry',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBasicTable<KnowledgeBaseEntryCategory>
            columns={columns}
            items={pageOfItems}
            pagination={pagination}
            rowProps={(row) => ({
              onClick: () => setSelectedCategory(row),
            })}
            sorting={sorting}
            onChange={onTableChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {selectedCategory ? (
        <EuiFlyout onClose={() => setSelectedCategory(null)}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>{capitalize(selectedCategory?.categoryName)}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiBasicTable<KnowledgeBaseEntry>
              items={selectedCategory?.entries ?? []}
              columns={columnsEntries}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </>
  );
}
