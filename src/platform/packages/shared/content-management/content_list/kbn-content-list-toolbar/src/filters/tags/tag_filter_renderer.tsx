/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHealth,
  useEuiTheme,
  type Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFilterDisplay, useFilterMetadata, TAG_FILTER_ID } from '@kbn/content-list-provider';
import type { Tag } from '@kbn/content-management-tags';
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
 * Consumes `useFilterMetadata('tag')` for display-ready tag facets with counts.
 * Falls back to an empty option list when `getMetadata` is not provided.
 *
 * Features:
 * - Multi-select with include/exclude support (Cmd+click to exclude).
 * - Tag counts per option (from `getMetadata`).
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const metadataQuery = useFilterMetadata(TAG_FILTER_ID, { enabled: isPopoverOpen });

  const options = useMemo((): Array<SelectableFilterOption<Tag>> => {
    if (!metadataQuery.data) {
      return [];
    }
    return metadataQuery.data.map((facet) => ({
      key: facet.key,
      label: facet.label,
      value: facet.label,
      count: facet.count,
      data: facet.data as Tag | undefined,
    }));
  }, [metadataQuery.data]);

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

  if (!hasTags) {
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
      isLoading={metadataQuery.isLoading}
      emptyMessage={i18nText.emptyMessage}
      noMatchesMessage={i18nText.noMatchesMessage}
      panelMinWidth={panelMinWidth}
      onToggle={setIsPopoverOpen}
      data-test-subj={dataTestSubj}
    />
  );
};
