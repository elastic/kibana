/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHealth,
  EuiLink,
  useEuiTheme,
  type Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListItems, useFilterDisplay } from '@kbn/content-list-provider';
import { useTagServices, type Tag } from '@kbn/content-management-tags';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from './selectable_filter_popover';

/**
 * Props for the {@link TagsRenderer} component.
 */
export interface TagsRendererProps {
  /** URL to the tag management page. If not provided, the "Manage tags" link is hidden. */
  tagManagementUrl?: string;
  /** Query object from `EuiSearchBar` (for `custom_component`). */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar` (for `custom_component`). */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

const shortTagLength = 20;
const mediumTagLength = 35;

const i18nText = {
  title: i18n.translate('contentManagement.contentList.tagsRenderer.tagsLabel', {
    defaultMessage: 'Tags',
  }),
  emptyMessage: i18n.translate('contentManagement.contentList.tagsRenderer.emptyMessage', {
    defaultMessage: "There aren't any tags",
  }),
  noMatchesMessage: i18n.translate('contentManagement.contentList.tagsRenderer.noMatchesMessage', {
    defaultMessage: 'No tag matches the search',
  }),
  manageTagsLink: i18n.translate('contentManagement.contentList.tagsRenderer.manageTagsLinkLabel', {
    defaultMessage: 'Manage tags',
  }),
};

/**
 * `TagsRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Features:
 * - Multi-select with include/exclude support (Cmd+click to exclude).
 * - Tag counts per option.
 * - Search within the popover.
 * - Colored tag badges.
 * - Optional "Manage tags" link.
 *
 * @param props - The component props. See {@link TagsRendererProps}.
 * @returns A React element containing the tags filter, or `null` if no tags are available.
 */
export const TagsRenderer = ({
  tagManagementUrl,
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListTagsRenderer',
}: TagsRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const { hasTags } = useFilterDisplay();
  const tagServices = useTagServices();
  const { items } = useContentListItems();

  const availableTags = useMemo(() => {
    if (!tagServices?.getTagList) {
      return [];
    }
    try {
      return tagServices.getTagList();
    } catch {
      return [];
    }
  }, [tagServices]);

  const tagLookupMap = useMemo(() => {
    const map = new Map<string, Tag>();
    availableTags.forEach((tag) => {
      if (tag.id) {
        map.set(tag.id, tag);
      }
      map.set(tag.name, tag);
    });
    return map;
  }, [availableTags]);

  // Count items per tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      item.tags?.forEach((tagId) => {
        const tagName = tagLookupMap.get(tagId)?.name ?? tagId;
        counts[tagName] = (counts[tagName] || 0) + 1;
      });
    });
    return counts;
  }, [items, tagLookupMap]);

  // Build options for SelectableFilterPopover
  const options = useMemo((): Array<SelectableFilterOption<Tag>> => {
    return availableTags.map((tag) => ({
      key: tag.id ?? tag.name,
      label: tag.name,
      value: tag.name, // Tags use name as the query value
      count: tagCounts[tag.name] ?? 0,
      data: tag,
    }));
  }, [availableTags, tagCounts]);

  // Calculate panel width based on longest tag name
  const panelWidth = useMemo(() => {
    const maxLen = Math.max(0, ...availableTags.map((t) => t.name.length));
    const multiplier = maxLen <= shortTagLength ? 18 : maxLen <= mediumTagLength ? 25 : 32;
    return multiplier * euiTheme.base;
  }, [availableTags, euiTheme.base]);

  if (!hasTags || availableTags.length === 0) {
    return null;
  }

  return (
    <SelectableFilterPopover<Tag>
      fieldName="tag"
      title={i18nText.title}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={(option, { isActive, onClick }) => (
        <StandardFilterOption count={option.count ?? 0} isActive={isActive} onClick={onClick}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiHealth
                color={option.data?.color}
                data-test-subj={`tag-searchbar-option-${option.label.replace(' ', '_')}`}
              >
                <EuiText size="s">{option.label}</EuiText>
              </EuiHealth>
            </EuiFlexItem>
          </EuiFlexGroup>
        </StandardFilterOption>
      )}
      emptyMessage={i18nText.emptyMessage}
      noMatchesMessage={i18nText.noMatchesMessage}
      panelWidth={panelWidth}
      footerContent={
        tagManagementUrl ? (
          <EuiFlexItem>
            <EuiLink href={tagManagementUrl} data-test-subj="manageAllTagsLink" external>
              {i18nText.manageTagsLink}
            </EuiLink>
          </EuiFlexItem>
        ) : undefined
      }
      data-test-subj={dataTestSubj}
    />
  );
};
