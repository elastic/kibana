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
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiTableSortingType,
} from '@elastic/eui';
import { useGetKnowledgeBaseEntries } from '../../hooks/use_get_knowledge_base_entries';
import { categorizeEntries, KnowledgeBaseEntryCategory } from '../../helpers/categorize_entries';
import { KnowledgeBaseEditManualEntryFlyout } from './knowledge_base_edit_manual_entry_flyout';
import { KnowledgeBaseCategoryFlyout } from './knowledge_base_category_flyout';
import { KnowledgeBaseBulkImportFlyout } from './knowledge_base_bulk_import_flyout';

export function KnowledgeBaseTab() {
  const { entries = [], isLoading } = useGetKnowledgeBaseEntries();

  const categories = categorizeEntries({ entries });

  const [selectedCategory, setSelectedCategory] = useState<
    KnowledgeBaseEntryCategory | undefined
  >();
  const [newManualEntryFlyoutOpen, setNewManualEntryFlyoutOpen] = useState(false);
  const [bulkImportFlyoutOpen, setBulkImportFlyoutOpen] = useState(false);
  const [newEntryPopoverOpen, setNewEntryPopoverOpen] = useState(false);

  const handleClickNewEntry = () => {
    setNewEntryPopoverOpen(true);
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
      name: 'Name',
      sortable: true,
    },
    {
      name: i18n.translate('aiAssistantManagementObservability.kbTab.columns.numberOfEntries', {
        defaultMessage: 'Number of entries',
      }),
      render: (category: KnowledgeBaseEntryCategory) =>
        category.entries.length === 1 && category.entries[0].labels.type === 'manual' ? null : (
          <EuiBadge>{category.entries.length}</EuiBadge>
        ),
    },
    {
      name: i18n.translate('aiAssistantManagementObservability.kbTab.columns.type', {
        defaultMessage: 'Type',
      }),
      render: (category: KnowledgeBaseEntryCategory) => {
        if (category.entries.length === 1 && category.entries[0].labels.type === 'manual') {
          return (
            <EuiBadge color="hollow">
              {i18n.translate('aiAssistantManagementObservability.kbTab.columns.manualBadgeLabel', {
                defaultMessage: 'Manual',
              })}
            </EuiBadge>
          );
        }

        return (
          <EuiBadge>
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
              <EuiPopover
                isOpen={newEntryPopoverOpen}
                button={
                  <EuiButton onClick={handleClickNewEntry}>
                    {i18n.translate(
                      'aiAssistantManagementObservability.knowledgeBaseTab.newEntryButtonLabel',
                      {
                        defaultMessage: 'New entry',
                      }
                    )}
                  </EuiButton>
                }
              >
                <EuiContextMenuPanel
                  size="s"
                  items={[
                    <EuiContextMenuItem
                      key="newSingleEntry"
                      icon="document"
                      onClick={() => {
                        setNewEntryPopoverOpen(false);
                        setNewManualEntryFlyoutOpen(true);
                      }}
                      size="s"
                    >
                      {i18n.translate(
                        'aiAssistantManagementObservability.knowledgeBaseTab.singleEntryContextMenuItemLabel',
                        { defaultMessage: 'Single entry' }
                      )}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="importBulk"
                      icon="documents"
                      onClick={() => {
                        setNewEntryPopoverOpen(false);
                        setBulkImportFlyoutOpen(true);
                      }}
                    >
                      {i18n.translate(
                        'aiAssistantManagementObservability.knowledgeBaseTab.bulkImportContextMenuItemLabel',
                        { defaultMessage: 'Bulk import' }
                      )}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBasicTable<KnowledgeBaseEntryCategory>
            columns={columns}
            items={pageOfItems}
            loading={isLoading}
            pagination={pagination}
            rowProps={(row) => ({
              onClick: () => setSelectedCategory(row),
            })}
            sorting={sorting}
            onChange={onTableChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {newManualEntryFlyoutOpen ? (
        <KnowledgeBaseEditManualEntryFlyout onClose={() => setNewManualEntryFlyoutOpen(false)} />
      ) : null}

      {bulkImportFlyoutOpen ? (
        <KnowledgeBaseBulkImportFlyout onClose={() => setBulkImportFlyoutOpen(false)} />
      ) : null}

      {selectedCategory ? (
        selectedCategory.entries.length === 1 &&
        selectedCategory.entries[0].labels.type === 'manual' ? (
          <KnowledgeBaseEditManualEntryFlyout
            entry={selectedCategory.entries[0]}
            onClose={() => setSelectedCategory(undefined)}
          />
        ) : (
          <KnowledgeBaseCategoryFlyout
            category={selectedCategory}
            onClose={() => setSelectedCategory(undefined)}
          />
        )
      ) : null}
    </>
  );
}
