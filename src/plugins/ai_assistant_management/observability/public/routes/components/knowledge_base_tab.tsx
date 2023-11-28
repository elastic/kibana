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
  EuiIcon,
  EuiPopover,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import moment from 'moment';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useGetKnowledgeBaseEntries } from '../../hooks/use_get_knowledge_base_entries';
import { categorizeEntries, KnowledgeBaseEntryCategory } from '../../helpers/categorize_entries';
import { KnowledgeBaseEditManualEntryFlyout } from './knowledge_base_edit_manual_entry_flyout';
import { KnowledgeBaseCategoryFlyout } from './knowledge_base_category_flyout';
import { KnowledgeBaseBulkImportFlyout } from './knowledge_base_bulk_import_flyout';
import { useAppContext } from '../../context/app_context';

export function KnowledgeBaseTab() {
  const [selectedCategory, setSelectedCategory] = useState<
    KnowledgeBaseEntryCategory | undefined
  >();

  const { uiSettings } = useAppContext();
  const dateFormat = uiSettings.get('dateFormat');

  const [flyoutOpenType, setFlyoutOpenType] = useState<
    'singleEntry' | 'bulkImport' | 'category' | undefined
  >();

  const [newEntryPopoverOpen, setNewEntryPopoverOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const { entries = [], isLoading, refetch } = useGetKnowledgeBaseEntries(searchQuery);
  const categories = categorizeEntries({ entries });

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntryCategory>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('aiAssistantManagementObservability.span.expandRowLabel', {
              defaultMessage: 'Expand row',
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
      field: '',
      name: '',
      render: (category: KnowledgeBaseEntryCategory) => {
        if (category.entries.length === 1 && category.entries[0].role === 'user_entry') {
          return <EuiIcon type="documentation" color="primary" />;
        }
        if (
          category.entries.length === 1 &&
          category.entries[0].role === 'assistant_summarization'
        ) {
          return <EuiIcon type="sparkles" color="primary" />;
        }

        return <EuiIcon type="logoElastic" />;
      },
      width: '40px',
    },
    {
      field: 'categoryName',
      name: i18n.translate('aiAssistantManagementObservability.kbTab.columns.name', {
        defaultMessage: 'Name',
      }),
    },
    {
      name: i18n.translate('aiAssistantManagementObservability.kbTab.columns.numberOfEntries', {
        defaultMessage: 'Number of entries',
      }),
      width: '140px',
      render: (category: KnowledgeBaseEntryCategory) => {
        if (
          category.entries.length === 1 &&
          (category.entries[0].role === 'user_entry' ||
            category.entries[0].role === 'assistant_summarization')
        ) {
          return null;
        }

        return <EuiBadge>{category.entries.length}</EuiBadge>;
      },
    },
    {
      field: '@timestamp',
      name: i18n.translate('aiAssistantManagementObservability.kbTab.columns.dateCreated', {
        defaultMessage: 'Date created',
      }),
      width: '140px',
      sortable: true,
      render: (timestamp: KnowledgeBaseEntry['@timestamp']) => (
        <EuiBadge color="hollow">{moment(timestamp).format(dateFormat)}</EuiBadge>
      ),
    },
    {
      name: i18n.translate('aiAssistantManagementObservability.kbTab.columns.type', {
        defaultMessage: 'Type',
      }),
      width: '140px',
      render: (category: KnowledgeBaseEntryCategory) => {
        if (category.entries.length === 1 && category.entries[0].role === 'user_entry') {
          return (
            <EuiBadge color="hollow">
              {i18n.translate('aiAssistantManagementObservability.kbTab.columns.manualBadgeLabel', {
                defaultMessage: 'Manual',
              })}
            </EuiBadge>
          );
        }

        if (
          category.entries.length === 1 &&
          category.entries[0].role === 'assistant_summarization'
        ) {
          return (
            <EuiBadge color="hollow">
              {i18n.translate(
                'aiAssistantManagementObservability.kbTab.columns.assistantSummarization',
                {
                  defaultMessage: 'Assistant',
                }
              )}
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

  const handleClickNewEntry = () => {
    setNewEntryPopoverOpen(true);
  };

  const handleChangeQuery = (e: React.ChangeEvent<HTMLInputElement> | undefined) => {
    setSearchQuery(e?.currentTarget.value || '');
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow>
              <EuiFieldSearch
                fullWidth
                placeholder={i18n.translate(
                  'aiAssistantManagementObservability.knowledgeBaseTab.euiFieldSearch.searchThisLabel',
                  { defaultMessage: 'Search for an entry' }
                )}
                value={searchQuery}
                onChange={handleChangeQuery}
                isClearable
                aria-label={i18n.translate(
                  'aiAssistantManagementObservability.knowledgeBaseTab.euiFieldSearch.searchEntriesLabel',
                  { defaultMessage: 'Search entries' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton color="success" iconType="refresh" onClick={() => refetch()}>
                {i18n.translate(
                  'aiAssistantManagementObservability.knowledgeBaseTab.reloadButtonLabel',
                  { defaultMessage: 'Reload' }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={newEntryPopoverOpen}
                closePopover={() => setNewEntryPopoverOpen(false)}
                button={
                  <EuiButton
                    fill
                    iconSide="right"
                    iconType="arrowDown"
                    onClick={handleClickNewEntry}
                  >
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
                      key="singleEntry"
                      icon="document"
                      onClick={() => {
                        setNewEntryPopoverOpen(false);
                        setFlyoutOpenType('singleEntry');
                      }}
                      size="s"
                    >
                      {i18n.translate(
                        'aiAssistantManagementObservability.knowledgeBaseTab.singleEntryContextMenuItemLabel',
                        { defaultMessage: 'Single entry' }
                      )}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="bulkImport"
                      icon="documents"
                      onClick={() => {
                        setNewEntryPopoverOpen(false);
                        setFlyoutOpenType('bulkImport');
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
            items={categories}
            loading={isLoading}
            rowProps={(row) => ({
              onClick: () => setSelectedCategory(row),
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {flyoutOpenType === 'singleEntry' ? (
        <KnowledgeBaseEditManualEntryFlyout onClose={() => setFlyoutOpenType(undefined)} />
      ) : null}

      {flyoutOpenType === 'bulkImport' ? (
        <KnowledgeBaseBulkImportFlyout onClose={() => setFlyoutOpenType(undefined)} />
      ) : null}

      {selectedCategory ? (
        selectedCategory.entries.length === 1 &&
        (selectedCategory.entries[0].role === 'user_entry' ||
          selectedCategory.entries[0].role === 'assistant_summarization') ? (
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
