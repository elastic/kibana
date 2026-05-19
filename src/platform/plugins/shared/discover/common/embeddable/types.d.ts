import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { SavedSearchAttributes, SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionEmbeddableState } from '../../server';
import type { EDITABLE_SAVED_SEARCH_KEYS } from './constants';
export interface NonPersistedDisplayOptions {
    solutionNavIdOverride?: 'oblt' | 'security' | 'search';
    enableDocumentViewer?: boolean;
    enableFilters?: boolean;
}
export type EditableSavedSearchAttributes = Partial<Pick<SavedSearchAttributes, (typeof EDITABLE_SAVED_SEARCH_KEYS)[number]>>;
export type SearchEmbeddableBaseState = SerializedTitles & SerializedTimeRange & SerializedDrilldowns & EditableSavedSearchAttributes & {
    nonPersistedDisplayOptions?: NonPersistedDisplayOptions;
};
export type SearchEmbeddableByValueState = SearchEmbeddableBaseState & {
    attributes: SavedSearchByValueAttributes;
};
export type SearchEmbeddableByReferenceState = SearchEmbeddableBaseState & {
    savedObjectId: string;
    selectedTabId?: string;
};
export type SearchEmbeddableState = SearchEmbeddableByValueState | SearchEmbeddableByReferenceState;
export type SearchEmbeddablePanelApiState = DiscoverSessionEmbeddableState | SearchEmbeddableState;
export type StoredSearchEmbeddableByValueState = SearchEmbeddableByValueState;
export type StoredSearchEmbeddableByReferenceState = Omit<SearchEmbeddableByReferenceState, 'nonPersistedDisplayOptions' | 'savedObjectId'>;
export type StoredSearchEmbeddableState = StoredSearchEmbeddableByValueState | StoredSearchEmbeddableByReferenceState;
