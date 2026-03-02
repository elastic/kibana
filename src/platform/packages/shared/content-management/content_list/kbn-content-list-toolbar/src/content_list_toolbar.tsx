/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { EuiSearchBar } from '@elastic/eui';
import type { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import {
  useContentListConfig,
  useContentListSearch,
  useContentListFilters,
} from '@kbn/content-list-provider';
import { useTagServices } from '@kbn/content-management-tags';
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
 * Uses the atomic `setSearch(queryText, filters)` call to update both the displayed query
 * text and the parsed filters in a single dispatch.
 *
 * When tag services are available, the toolbar parses tag filter syntax
 * (e.g., `tag:production`) from the query text using `parseSearchQuery`.
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
 *     <Filters.Tags />
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
  const { filters: currentFilters } = useContentListFilters();
  const tagServices = useTagServices();
  const filters = useFilters(children);

  // Keep a ref so the error-recovery branch of handleSearchChange can read the
  // latest filters without making them a useCallback dependency (which would
  // cause the callback to re-create on every tag toggle).
  const currentFiltersRef = useRef(currentFilters);
  currentFiltersRef.current = currentFilters;

  const handleSearchChange = useCallback(
    ({ queryText, error }: EuiSearchBarOnChangeArgs) => {
      if (error) {
        return;
      }

      if (tagServices?.parseSearchQuery) {
        try {
          const { searchQuery, tagIds, tagIdsToExclude } = tagServices.parseSearchQuery(queryText);
          const hasTags =
            (tagIds && tagIds.length > 0) || (tagIdsToExclude && tagIdsToExclude.length > 0);

          setSearch(queryText, {
            search: searchQuery?.trim() || undefined,
            ...(hasTags && {
              tag: { include: tagIds ?? [], exclude: tagIdsToExclude ?? [] },
            }),
          });
        } catch (e) {
          // Preserve existing filters on parse failure so structured
          // filters aren't silently dropped while the search bar still
          // displays filter syntax.
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn(
              '[ContentListToolbar] parseSearchQuery failed, preserving existing filters',
              e
            );
          }
          setSearch(queryText, {
            ...currentFiltersRef.current,
            search: queryText?.trim() || undefined,
          });
        }
      } else {
        // `queryText` preserves the raw input (including whitespace) for display fidelity.
        // `filters.search` is trimmed so data fetching ignores leading/trailing spaces.
        setSearch(queryText, { search: queryText.trim() || undefined });
      }
    },
    [setSearch, tagServices]
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
