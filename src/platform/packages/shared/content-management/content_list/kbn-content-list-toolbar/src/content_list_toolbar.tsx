/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiSearchBar } from '@elastic/eui';
import type { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { useContentListConfig, useContentListSearch } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import { Filters } from './filters';
import { useFilters } from './hooks';
import { SelectionBar } from './selection_bar';

/**
 * Props for the {@link ContentListToolbar} component.
 */
export interface ContentListToolbarProps {
  /** Optional children for declarative configuration via {@link Filters}. */
  children?: ReactNode;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

const defaultPlaceholder = i18n.translate(
  'contentManagement.contentList.toolbar.searchPlaceholder',
  { defaultMessage: 'Search…' }
);

/**
 * `ContentListToolbar` component.
 *
 * Provides a toolbar with search and filter controls for content lists using `EuiSearchBar`.
 * Currently supports search and the Sort filter; additional filters will be added in subsequent PRs.
 *
 * When items are selected in the table, a "Delete N entities" button appears in the
 * toolbar's left tools area (via `EuiSearchBar`'s `toolsLeft`), matching the existing
 * `TableListView` pattern.
 *
 * **Smart Defaults**: When no children are provided, auto-renders filters
 * based on provider configuration.
 *
 * **Declarative Configuration**: Use {@link Filters} children
 * to customize filter order.
 *
 * @param props - The component props. See {@link ContentListToolbarProps}.
 * @returns A React element containing the toolbar.
 *
 * @example
 * ```tsx
 * const { Filters } = ContentListToolbar;
 *
 * // Smart defaults - auto-renders based on provider config.
 * <ContentListToolbar />
 *
 * // Custom filter order.
 * <ContentListToolbar>
 *   <Filters>
 *     <Filters.Sort />
 *   </Filters>
 * </ContentListToolbar>
 * ```
 */
const ContentListToolbarComponent = ({
  children,
  'data-test-subj': dataTestSubj = 'contentListToolbar',
}: ContentListToolbarProps) => {
  const { labels, supports } = useContentListConfig();
  const { search, setSearch, isSupported: searchIsSupported } = useContentListSearch();
  const filters = useFilters(children);

  const handleSearchChange = useCallback(
    ({ queryText, error }: EuiSearchBarOnChangeArgs) => {
      if (error) {
        return;
      }
      // `queryText` preserves the raw input (including whitespace) for display fidelity.
      // `filters.search` is trimmed so data fetching ignores leading/trailing spaces.
      setSearch(queryText, { search: queryText.trim() || undefined });
    },
    [setSearch]
  );

  // Only include the selection bar when selection is supported to avoid
  // running selection hooks unnecessarily in read-only or selection-disabled modes.
  const toolsLeft = useMemo(
    () =>
      supports.selection
        ? [<SelectionBar key="selection" data-test-subj={`${dataTestSubj}-selectionBar`} />]
        : undefined,
    [supports.selection, dataTestSubj]
  );

  return (
    <EuiSearchBar
      query={search}
      box={{
        placeholder: labels.searchPlaceholder ?? defaultPlaceholder,
        incremental: true,
        'data-test-subj': `${dataTestSubj}-searchBox`,
        disabled: !searchIsSupported,
      }}
      onChange={handleSearchChange}
      toolsLeft={toolsLeft}
      filters={filters}
      data-test-subj={dataTestSubj}
    />
  );
};

// Attach sub-components to `ContentListToolbar` namespace.
export const ContentListToolbar = Object.assign(ContentListToolbarComponent, {
  Filters,
  SelectionBar,
});
