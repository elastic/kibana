/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  EuiPanel,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiLoadingSpinner,
  EuiText,
  EuiHorizontalRule,
  EuiLink,
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiFormRow,
  EuiComboBox,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface TaggedItem {
  id: string;
  title: string;
  type: string;
  link: string;
  tags: string[];
}

export interface TaggedItemsPanelProps {
  color?:
    | 'transparent'
    | 'plain'
    | 'subdued'
    | 'primary'
    | 'success'
    | 'accent'
    | 'warning'
    | 'danger';
  hasBorder?: boolean;
  hasShadow?: boolean;
  paddingSize?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl';
  borderRadius?: 'none' | 'm';
  css?: any;
  hideTitle?: boolean;
  items?: TaggedItem[];
  isLoading?: boolean;
  error?: Error | null;
  onItemSelect?: (item: TaggedItem) => void;
  availableTags?: Array<{ id: string; name: string; color: string }>;
  onTagsChange?: (tagNames: string[]) => void;
  initialSelectedTags?: string[];
}

export const TaggedItemsPanel: React.FC<TaggedItemsPanelProps> = ({
  color = 'transparent',
  hasBorder = true,
  hasShadow = false,
  paddingSize = 'm',
  borderRadius = 'm',
  css,
  hideTitle = false,
  items = [],
  isLoading = false,
  error = null,
  onItemSelect,
  availableTags: providedAvailableTags,
  onTagsChange,
  initialSelectedTags = [],
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(initialSelectedTags);

  // Update local state when initialSelectedTags prop changes
  useEffect(() => {
    setLocalSelectedTags(initialSelectedTags);
  }, [initialSelectedTags]);

  // Use provided available tags or fallback to mock data
  const availableTags = useMemo(
    () =>
      providedAvailableTags || [
        { id: 'tag1', name: 'takemehome', color: '#0077CC' },
        { id: 'tag2', name: 'important', color: '#D36086' },
        { id: 'tag3', name: 'work', color: '#490092' },
        { id: 'tag4', name: 'personal', color: '#00BFB3' },
      ],
    [providedAvailableTags]
  );

  const getIconType = useCallback((item: TaggedItem): string => {
    switch (item.type) {
      case 'dashboard':
        return 'dashboardApp';
      case 'discover':
        return 'discoverApp';
      default:
        return 'document';
    }
  }, []);

  const handleItemClick = useCallback(
    (item: TaggedItem) => {
      if (onItemSelect) {
        onItemSelect(item);
      }
    },
    [onItemSelect]
  );

  const columns = useMemo(
    () => [
      {
        field: 'title',
        name: (
          <FormattedMessage
            id="contentManagement.tableListView.nameColumnTitle"
            defaultMessage="Name"
          />
        ),
        render: (title: string, item: TaggedItem) => (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={getIconType(item)} size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink color="text" onClick={() => handleItemClick(item)}>
                {title}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'tags',
        name: (
          <FormattedMessage
            id="contentManagement.tableListView.tagsColumnTitle"
            defaultMessage="Tags"
          />
        ),
        render: (tags: string[]) => (
          <EuiFlexGroup wrap gutterSize="xs">
            {tags.map((tagId) => {
              const tag = availableTags.find((t) => t.id === tagId);
              return tag ? (
                <EuiFlexItem key={tagId} grow={false}>
                  <EuiBadge color={tag.color}>{tag.name}</EuiBadge>
                </EuiFlexItem>
              ) : null;
            })}
          </EuiFlexGroup>
        ),
      },
    ],
    [getIconType, handleItemClick, availableTags]
  );

  const pagination = useMemo(() => {
    if (items.length <= 10) {
      return undefined;
    }
    return {
      pageIndex: 0,
      pageSize: 10,
      pageSizeOptions: [10],
      showPerPageOptions: false,
      totalItemCount: items.length,
    };
  }, [items.length]);

  if (isLoading) {
    return (
      <EuiPanel
        color={color}
        hasBorder={hasBorder}
        hasShadow={hasShadow}
        paddingSize={paddingSize}
        borderRadius={borderRadius}
        css={css}
      >
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel
        color={color}
        hasBorder={hasBorder}
        hasShadow={hasShadow}
        paddingSize={paddingSize}
        borderRadius={borderRadius}
        css={css}
      >
        <EuiText color="danger">
          <FormattedMessage
            id="contentManagement.tableListView.errorMessage"
            defaultMessage="Error loading tagged items: {error}"
            values={{ error: error.message }}
          />
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      color={color}
      hasBorder={hasBorder}
      hasShadow={hasShadow}
      paddingSize={paddingSize}
      borderRadius={borderRadius}
      css={css}
    >
      {!hideTitle && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="tag" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="contentManagement.tableListView.taggedItemsTitle"
                    defaultMessage="Tagged Items"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiFilterGroup compressed>
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                      isSelected={isSettingsOpen}
                      numActiveFilters={localSelectedTags.length}
                      hasActiveFilters={localSelectedTags.length > 0}
                      badgeColor="success"
                    >
                      Tags
                    </EuiFilterButton>
                  </EuiFilterGroup>
                }
                isOpen={isSettingsOpen}
                closePopover={() => setIsSettingsOpen(false)}
                panelPaddingSize="m"
                anchorPosition="downRight"
              >
                <div style={{ minWidth: '300px' }}>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="contentManagement.tableListView.selectTagsLabel"
                        defaultMessage="Select tags to display"
                      />
                    }
                  >
                    <EuiComboBox
                      placeholder=""
                      options={availableTags.map((tag) => ({
                        label: tag.name,
                        value: tag.id,
                      }))}
                      selectedOptions={
                        localSelectedTags
                          .map((tagId) => {
                            const tag = availableTags.find((t) => t.id === tagId);
                            return tag ? { label: tag.name, value: tag.id } : null;
                          })
                          .filter(Boolean) as Array<{ label: string; value: string }>
                      }
                      onChange={(selectedOptions) => {
                        const newSelectedTags = selectedOptions
                          .map((option) => option.value)
                          .filter((value): value is string => value !== undefined);
                        setLocalSelectedTags(newSelectedTags);

                        // Convert tag IDs to tag names and call the callback
                        if (onTagsChange) {
                          const tagNames = newSelectedTags
                            .map((tagId) => {
                              const tag = availableTags.find((t) => t.id === tagId);
                              return tag ? tag.name : null;
                            })
                            .filter((name): name is string => name !== null);
                          onTagsChange(tagNames);
                        }
                      }}
                      fullWidth
                    />
                  </EuiFormRow>
                  <EuiSpacer size="s" />
                </div>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" style={{ marginTop: '6px' }} />
        </>
      )}

      {items.length === 0 ? (
        <EuiText color="subdued" textAlign="center">
          <FormattedMessage
            id="contentManagement.tableListView.noTaggedItems"
            defaultMessage="No tagged items found"
          />
        </EuiText>
      ) : (
        <EuiPanel color="plain" hasBorder paddingSize="m">
          <EuiBasicTable
            items={items}
            columns={columns}
            pagination={pagination}
            tableLayout="auto"
          />
        </EuiPanel>
      )}
    </EuiPanel>
  );
};
