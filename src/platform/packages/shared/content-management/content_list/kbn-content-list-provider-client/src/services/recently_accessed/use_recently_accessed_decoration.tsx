/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ComponentType } from 'react';
import { filter } from '@kbn/content-list-toolbar';
import { i18n } from '@kbn/i18n';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { SortingConfig } from '@kbn/content-list-provider';
import { RecentsFilterRenderer, RECENT_FIELD } from './recents_filter_renderer';
import type { RecentlyAccessedHistorySource } from './types';
import { defineContentListSortField, type ContentListSortFieldMap } from '../../sorting';

const RECENTLY_ACCESSED_SORT_LABEL = i18n.translate(
  'contentManagement.contentListProviderClient.recentlyAccessed.sortField.title',
  { defaultMessage: 'Recently viewed' }
);

const RECENTLY_ACCESSED_SORT_DESCRIPTION = i18n.translate(
  'contentManagement.contentListProviderClient.recentlyAccessed.sortField.description',
  {
    defaultMessage:
      'Recently viewed info is stored locally in your browser and is only visible to you.',
  }
);

/** Field id for the recently-accessed sort. */
export const ACCESSED_AT_FIELD = 'accessedAt' as const;

/**
 * Minimal shape consumed by {@link RecentlyAccessedDecoration.decorate}.
 *
 * Defined locally rather than re-using `TableListViewFindItemsResult` so the
 * decorator can stay generic over the consumer's hit type without forcing
 * `TableListViewFindItemsResult` itself to become generic (which would be a
 * breaking change for existing consumers).
 */
export interface DecorableFindItemsResult<Hit extends { id: string }> {
  total: number;
  hits: Hit[];
}

/**
 * Decoration added to each hit by {@link RecentlyAccessedDecoration.decorate}.
 * Consumers should extend their item type with these fields so
 * `Column.UpdatedAt`-style sort fields and `is:recent` filtering work
 * end-to-end.
 *
 * - `recent` powers the toolbar's `is:recent` filter via the strategy's
 *   generic flag matcher (see `features.flags`).
 * - `accessedAt` is a numeric score (`history.length - index`) that can drive
 *   an opt-in "Recently viewed" sort field.
 */
export interface RecentDecoration {
  /** True when the item appears in the recently-accessed history. */
  recent: boolean;
  /**
   * Recency score — higher means more recently viewed. `0` for items not in
   * the history. A `desc` sort on this field mirrors the legacy
   * `sortByRecentlyAccessed` ordering.
   */
  accessedAt: number;
}

/**
 * Result returned by {@link useRecentlyAccessedDecoration}.
 */
export interface RecentlyAccessedDecoration {
  /**
   * Decorate a `findItems` result with `recent`/`accessedAt` based on the
   * supplied source. Reads the source synchronously at call time so each
   * fetch picks up the latest history.
   */
  decorate: <Hit extends { id: string }>(
    result: DecorableFindItemsResult<Hit>
  ) => DecorableFindItemsResult<Hit & RecentDecoration>;
  /**
   * Flag entry to add to `features.flags` so `EuiSearchBar` parses
   * `is:recent` into `filters.recent`.
   */
  flag: { flagName: string; modelKey: keyof RecentDecoration };
  /**
   * Declarative filter component for the toolbar's `<Filters>` slot. The
   * underlying renderer is closure-bound to the supplied source, so consumers
   * just `<recents.RecentsFilter />` without re-passing the service.
   */
  RecentsFilter: ComponentType<Record<never, never>>;
  /**
   * Spread into `features.sorting.fields` so the sort dropdown exposes "Recently viewed".
   * Recently-accessed items sort first in history order (most recent first);
   * items not in the history follow, ordered by `updatedAt` descending.
   * Empty when the history has no entries, so the option isn't offered.
   */
  sortFields: ContentListSortFieldMap;
  /**
   * Initial sort for `features.sorting.initialSort`: "Recently viewed" when the history has
   * entries, otherwise `undefined`. Fall back to your own default with `??`.
   */
  initialSort: SortingConfig['initialSort'];
}

/** Builds the "Recently viewed" sort entry, or no entries when there's no history to sort by. */
const getSortFields = (hasHistory: boolean): ContentListSortFieldMap => {
  return hasHistory
    ? {
        [ACCESSED_AT_FIELD]: defineContentListSortField<UserContentCommonSchema & RecentDecoration>(
          {
            id: ACCESSED_AT_FIELD,
            title: RECENTLY_ACCESSED_SORT_LABEL,
            descLabel: RECENTLY_ACCESSED_SORT_LABEL,
            allowedDirections: ['desc'],
            description: RECENTLY_ACCESSED_SORT_DESCRIPTION,
            getValue: (item) => item.accessedAt || null,
            fallbackSort: { field: 'updatedAt', direction: 'desc' },
          }
        ),
      }
    : {};
};

/**
 * Build the recently-accessed integration for a saved-object listing in one
 * call: a `findItems` decorator, the `features.flags` entry, and a
 * toolbar-ready `RecentsFilter` component.
 *
 * The supplied `source` is closure-captured by the filter component, so
 * consumers don't have to forward it themselves. Pass any `{ get(): { id }[] }`
 * — typically a `RecentlyAccessed` from `@kbn/recently-accessed`.
 *
 * @example
 * ```tsx
 * const recents = useRecentlyAccessedDecoration(getDashboardRecentlyAccessedService());
 *
 * <ContentListClientProvider
 *   findItems={async (q, opts) => recents.decorate(await rawSearch(q, opts))}
 *   features={{ flags: [recents.flag] }}
 * >
 *   <ContentListToolbar>
 *     <Filters>
 *       <Filters.Starred />
 *       <recents.RecentsFilter />
 *       <Filters.Tags />
 *     </Filters>
 *   </ContentListToolbar>
 * </ContentListClientProvider>
 * ```
 *
 * The hook is stable across renders for a given `source` reference. When
 * the source identity changes the bound `RecentsFilter` is rebuilt — pass a
 * stable singleton (e.g. `getDashboardRecentlyAccessedService()`) in
 * practice.
 */
export const useRecentlyAccessedDecoration = (
  source: RecentlyAccessedHistorySource
): RecentlyAccessedDecoration => {
  const hasHistory = useMemo(() => source.get().length > 0, [source]);
  const RecentsFilter = useMemo(
    () =>
      filter.createComponent<Record<never, never>>({
        resolve: () => ({
          type: 'custom_component',
          component: (props) => <RecentsFilterRenderer {...props} service={source} />,
        }),
      }),
    [source]
  );

  return useMemo<RecentlyAccessedDecoration>(
    () => ({
      decorate: (result) => {
        const history = source.get();
        const total = history.length;
        const scoreById = new Map<string, number>(
          history.map((entry, index) => [entry.id, total - index])
        );

        const hits = result.hits.map((hit) => {
          const accessedAt = scoreById.get(hit.id) ?? 0;
          return { ...hit, recent: accessedAt > 0, accessedAt };
        });

        return { ...result, hits };
      },
      flag: { flagName: RECENT_FIELD, modelKey: 'recent' },
      RecentsFilter,
      sortFields: getSortFields(hasHistory),
      initialSort: hasHistory ? { field: ACCESSED_AT_FIELD, direction: 'desc' } : undefined,
    }),
    [RecentsFilter, source, hasHistory]
  );
};
