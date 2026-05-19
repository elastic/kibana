import type { ActiveFilters } from '../datasource';
import type { ContentListQueryModel } from './types';
/**
 * Convert a {@link ContentListQueryModel} to the {@link ActiveFilters} shape
 * expected by `findItems`.
 *
 * Maps:
 * - `model.search` → `filters.search`
 * - `model.flags[key]` → `filters[key]` as `IncludeExcludeFlag`
 * - `model.filters[field]` → `filters[field]` as `IncludeExcludeFilter`
 */
export declare const toFindItemsFilters: (model: ContentListQueryModel) => ActiveFilters;
