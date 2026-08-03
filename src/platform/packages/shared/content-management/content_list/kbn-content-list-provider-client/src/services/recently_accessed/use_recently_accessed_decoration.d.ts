import { type ComponentType } from 'react';
import type { RecentlyAccessedHistorySource } from './types';
/**
 * Minimal shape consumed by {@link RecentlyAccessedDecoration.decorate}.
 *
 * Defined locally rather than re-using `TableListViewFindItemsResult` so the
 * decorator can stay generic over the consumer's hit type without forcing
 * `TableListViewFindItemsResult` itself to become generic (which would be a
 * breaking change for existing consumers).
 */
export interface DecorableFindItemsResult<Hit extends {
    id: string;
}> {
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
    decorate: <Hit extends {
        id: string;
    }>(result: DecorableFindItemsResult<Hit>) => DecorableFindItemsResult<Hit & RecentDecoration>;
    /**
     * Flag entry to add to `features.flags` so `EuiSearchBar` parses
     * `is:recent` into `filters.recent`.
     */
    flag: {
        flagName: string;
        modelKey: keyof RecentDecoration;
    };
    /**
     * Declarative filter component for the toolbar's `<Filters>` slot. The
     * underlying renderer is closure-bound to the supplied source, so consumers
     * just `<recents.RecentsFilter />` without re-passing the service.
     */
    RecentsFilter: ComponentType<Record<never, never>>;
}
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
export declare const useRecentlyAccessedDecoration: (source: RecentlyAccessedHistorySource) => RecentlyAccessedDecoration;
