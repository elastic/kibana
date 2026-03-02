/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHealth,
  useEuiTheme,
  type Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListItems, useFilterDisplay, TAG_FILTER_ID } from '@kbn/content-list-provider';
import { useTagServices, type Tag } from '@kbn/content-management-tags';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from '../selectable_filter_popover';

/**
 * Props for the {@link TagFilterRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props. The tag filter uses these to sync include/exclude
 * state directly with the search bar query text.
 */
export interface TagFilterRendererProps {
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar`. */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

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
};

/**
 * `TagFilterRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * This is a thin wrapper around {@link SelectableFilterPopover} that provides
 * tag-specific data: options with colors, per-tag item counts, and dynamic
 * panel sizing.
 *
 * Features:
 * - Multi-select with include/exclude support (Cmd+click to exclude).
 * - Tag counts per option.
 * - Search within the popover.
 * - Colored tag badges.
 *
 * Requires `ContentManagementTagsProvider` in the component tree (automatically
 * provided when `services.tags` is configured on the `ContentListProvider`).
 */
export const TagFilterRenderer = ({
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListTagsRenderer',
}: TagFilterRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const { hasTags } = useFilterDisplay();
  const tagServices = useTagServices();
  const { counts } = useContentListItems();

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

  // Build options for `SelectableFilterPopover`. Counts are only included
  // when the data source provides full-set counts — per-page counts would
  // be misleading with pagination. Counts are keyed by filter id in
  // `FindItemsResult.counts`; for tags, use `counts[TAG_FILTER_ID]` keyed by tag ID
  // (or name for tags without an ID).
  const tagCounts = counts?.[TAG_FILTER_ID];
  const options = useMemo((): Array<SelectableFilterOption<Tag>> => {
    return availableTags.map((tag) => ({
      key: tag.id ?? tag.name,
      label: tag.name,
      value: tag.name,
      count: tagCounts?.[tag.id ?? tag.name],
      data: tag,
    }));
  }, [availableTags, tagCounts]);

  // Minimum panel width derived from the EUI base unit so the popover
  // doesn't collapse on short tag names. The panel grows naturally beyond
  // this minimum when tags have longer names.
  const panelMinWidth = euiTheme.base * 24;

  const renderOption = useCallback(
    (option: SelectableFilterOption<Tag>, state: { isActive: boolean }) => (
      <StandardFilterOption count={option.count} isActive={state.isActive}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth
              color={option.data?.color}
              data-test-subj={`tag-searchbar-option-${option.key}`}
            >
              <EuiText size="s">{option.label}</EuiText>
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StandardFilterOption>
    ),
    []
  );

  if (!hasTags || availableTags.length === 0) {
    return null;
  }

  return (
    <SelectableFilterPopover<Tag>
      fieldName={TAG_FILTER_ID}
      title={i18nText.title}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      emptyMessage={i18nText.emptyMessage}
      noMatchesMessage={i18nText.noMatchesMessage}
      panelMinWidth={panelMinWidth}
      data-test-subj={dataTestSubj}
    />
  );
};
