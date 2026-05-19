import type { ReactNode } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
/**
 * Hook to parse and build toolbar filters from declarative children.
 *
 * Encapsulates the full filter resolution flow:
 * 1. Extract `<Filters>` children from the toolbar's children.
 * 2. Parse declarative `Filter` presets via `filter.parseChildren`.
 * 3. Resolve `SearchFilterConfig` objects via `filter.resolve`.
 * 4. Fall back to default filters (tags + sort) if none are found.
 *
 * @param children - React children from the toolbar component.
 * @returns Array of EUI search filter configs ready for `EuiSearchBar`.
 */
export declare const useFilters: (children: ReactNode) => SearchFilterConfig[];
