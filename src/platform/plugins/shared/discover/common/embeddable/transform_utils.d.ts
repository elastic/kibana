import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionEmbeddableByReferenceState, DiscoverSessionEmbeddableByValueState, DiscoverSessionEmbeddableState, DiscoverSessionPanelOverrides, DiscoverSessionTab } from '../../server';
import type { SearchEmbeddableByReferenceState, SearchEmbeddableState, StoredSearchEmbeddableByReferenceState, StoredSearchEmbeddableByValueState, StoredSearchEmbeddableState } from './types';
export declare function fromStoredSearchEmbeddable(storedState: SearchEmbeddableState | StoredSearchEmbeddableState, references?: SavedObjectReference[]): DiscoverSessionEmbeddableState;
export declare function toStoredSearchEmbeddable(apiState: DiscoverSessionEmbeddableState, references?: SavedObjectReference[]): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
};
export declare function fromStoredSearchEmbeddableByRef(storedState: SearchEmbeddableByReferenceState | StoredSearchEmbeddableByReferenceState, references?: SavedObjectReference[]): DiscoverSessionEmbeddableByReferenceState;
export declare function toStoredSearchEmbeddableByRef(apiState: DiscoverSessionEmbeddableByReferenceState, references?: SavedObjectReference[]): {
    state: StoredSearchEmbeddableByReferenceState;
    references: SavedObjectReference[];
};
export declare function fromStoredSearchEmbeddableByValue(storedState: StoredSearchEmbeddableByValueState, references?: SavedObjectReference[]): DiscoverSessionEmbeddableByValueState;
export declare function toStoredSearchEmbeddableByValue(apiState: DiscoverSessionEmbeddableByValueState, references?: SavedObjectReference[]): {
    state: StoredSearchEmbeddableByValueState;
    references: SavedObjectReference[];
};
export declare function fromStoredTab(tab: DiscoverSessionTabAttributes, references?: SavedObjectReference[]): DiscoverSessionTab;
export declare function toStoredTab(apiTab: DiscoverSessionTab): {
    state: DiscoverSessionTabAttributes;
    references: SavedObjectReference[];
};
export declare function toDiscoverSessionPanelOverrides(storedState: StoredSearchEmbeddableState | DiscoverSessionTabAttributes): DiscoverSessionPanelOverrides;
export declare function fromDiscoverSessionPanelOverrides(apiState: DiscoverSessionPanelOverrides): StoredSearchEmbeddableState;
export declare function fromStoredGrid(grid: DiscoverSessionTabAttributes['grid']): DiscoverSessionTab['column_settings'];
export declare function toStoredGrid(columnSettings?: DiscoverSessionTab['column_settings']): DiscoverSessionTabAttributes['grid'];
export declare function fromStoredSort(sort: DiscoverSessionTabAttributes['sort']): DiscoverSessionTab['sort'];
export declare function toStoredSort(sort?: DiscoverSessionTab['sort']): DiscoverSessionTabAttributes['sort'] & SavedSearchAttributes['sort'];
export declare function fromStoredHeight(height?: number): DiscoverSessionTab['row_height'];
export declare function toStoredHeight(height: DiscoverSessionTab['row_height'] | DiscoverSessionTab['header_row_height']): number;
