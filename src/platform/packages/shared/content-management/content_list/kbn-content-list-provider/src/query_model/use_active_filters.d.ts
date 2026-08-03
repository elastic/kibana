import type { ActiveFilters } from '../datasource';
/**
 * Derive {@link ActiveFilters} from the current `queryText` in state.
 *
 * This is the single shared derivation point — all consumers that need
 * `ActiveFilters` should call this hook instead of independently calling
 * `useQueryModel` + `toFindItemsFilters`. This avoids redundant EUI
 * `Query.parse` + field resolution on every keystroke.
 */
export declare const useActiveFilters: () => ActiveFilters;
