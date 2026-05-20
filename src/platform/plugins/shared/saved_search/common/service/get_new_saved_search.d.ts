import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { SavedSearch } from '../types';
/**
 * Returns a new saved search
 * Used when e.g. Discover is opened without a saved search id
 * @param search
 */
export declare const getNewSavedSearch: ({ searchSource, }: {
    searchSource: ISearchStartSearchSource;
}) => SavedSearch;
