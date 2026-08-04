import type { ReactNode } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
/**
 * Hook to parse and build toolbar filters from declarative children.
 *
 * Encapsulates the full filter resolution flow:
 * 1. Extract `<Filters>` children from the toolbar's children.
 * 2. Parse declarative `Filter` presets via `filter.parseChildren`.
 * 3. Resolve `SearchFilterConfig` objects via `filter.resolve`.
 * 4. Fall back to default filters (starred + tags + created by + sort) if none are found.
 *
 * Custom (consumer-registered) filters are *not* rendered automatically; a
 * registered filter dimension powers KQL search and facet counts on its own,
 * and its toolbar control is placed explicitly via `filter.createComponent`
 * (see `createFilterControl` in `@kbn/content-list-provider-client`).
 *
 * @param children - React children from the toolbar component.
 * @returns Array of EUI search filter configs ready for `EuiSearchBar`.
 */
export declare const useFilters: (children: ReactNode) => SearchFilterConfig[];
