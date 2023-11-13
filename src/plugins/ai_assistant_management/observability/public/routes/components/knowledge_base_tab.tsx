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
  EuiScreenReaderOnly,
  EuiTableSortingType,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import type { KnowledgeBaseEntry } from '../../../common/types';
import { useGetKnowledgeBaseEntries } from '../../hooks/use_get_knowledge_base_entries';
import { KnowledgeBaseNewManualEntryFlyout } from './knowledge_base_new_manual_entry_flyout';
import { KnowledgeBaseCategoryFlyout } from './knowledge_base_category_flyout';

interface KnowledgeBaseEntryCategory {
  categoryName: string;
  entries: KnowledgeBaseEntry[];
}

export function KnowledgeBaseTab() {
  const { entries = [] } = useGetKnowledgeBaseEntries();

  const categories = entries.reduce((acc, entry) => {
    const categoryName = entry.labels.category ?? 'other';

    const index = acc.findIndex((item) => item.categoryName === categoryName);

    if (index > -1) {
      acc[index].entries.push(entry);
      return acc;
    } else {
      return acc.concat({ categoryName, entries: [entry] });
    }
  }, [] as Array<{ categoryName: string; entries: KnowledgeBaseEntry[] }>);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newEntryFlyoutOpen, setNewEntryFlyoutOpen] = useState(false);

  const handleClickNewEntry = () => {
    setNewEntryFlyoutOpen(true);
  };

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntryCategory>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('aiAssistantManagementObservability.span.expandRowsLabel', {
              defaultMessage: 'Expand rows',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (category: KnowledgeBaseEntryCategory) => {
        return (
          <EuiButtonIcon
            onClick={() => setSelectedCategory(category.categoryName)}
            aria-label={category.categoryName === selectedCategory ? 'Collapse' : 'Expand'}
            iconType={category.categoryName === selectedCategory ? 'minimize' : 'expand'}
          />
        );
      },
    },
    {
      field: 'categoryName',
      name: 'Category',
      sortable: true,
      render: (categoryName: KnowledgeBaseEntryCategory['categoryName']) => (
        <strong>{capitalize(categoryName)}</strong>
      ),
    },
    {
      field: 'entries',
      name: 'Number of entries',
      sortable: true,
      render: (categoryEntries: KnowledgeBaseEntryCategory['entries']) => (
        <EuiBadge>{categoryEntries.length}</EuiBadge>
      ),
    },
    {
      name: 'Type',
      render: (category: KnowledgeBaseEntryCategory) => {
        return (
          <EuiBadge color="hollow">
            {i18n.translate('aiAssistantManagementObservability.columns.systemBadgeLabel', {
              defaultMessage: 'System',
            })}
          </EuiBadge>
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
                  'aiAssistantManagementObservability.knowledgeBaseTab.euiFieldSearch.searchThisLabel',
                  { defaultMessage: 'Search this' }
                )}
                value={''}
                onChange={(e) => {}}
                isClearable
                aria-label={i18n.translate(
                  'aiAssistantManagementObservability.knowledgeBaseTab.euiFieldSearch.searchEntriesLabel',
                  { defaultMessage: 'Search entries' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleClickNewEntry}>
                {i18n.translate(
                  'aiAssistantManagementObservability.knowledgeBaseTab.newEntryButtonLabel',
                  {
                    defaultMessage: 'New entry',
                  }
                )}
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
              onClick: () => setSelectedCategory(row.categoryName),
            })}
            sorting={sorting}
            onChange={onTableChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {selectedCategory ? (
        <KnowledgeBaseCategoryFlyout
          category={selectedCategory}
          entries={categories.find((obj) => obj.categoryName === selectedCategory)?.entries || []}
          onClose={() => setSelectedCategory('')}
        />
      ) : null}

      {newEntryFlyoutOpen ? (
        <KnowledgeBaseNewManualEntryFlyout onClose={() => setNewEntryFlyoutOpen(false)} />
      ) : null}
    </>
  );
}
