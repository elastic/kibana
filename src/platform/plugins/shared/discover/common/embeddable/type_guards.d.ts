import type { DiscoverSessionEmbeddableByReferenceState, DiscoverSessionEmbeddableState, DiscoverSessionEsqlTab, DiscoverSessionTab } from '../../server';
import type { SearchEmbeddableByValueState, SearchEmbeddablePanelApiState, SearchEmbeddableState, StoredSearchEmbeddableByValueState, StoredSearchEmbeddableState } from './types';
export declare function isDiscoverSessionEmbeddableByReferenceState(state: DiscoverSessionEmbeddableState): state is DiscoverSessionEmbeddableByReferenceState;
export declare function isDiscoverSessionEsqlTab(tab: DiscoverSessionTab): tab is DiscoverSessionEsqlTab;
export declare function isSearchEmbeddableByValueState(state: SearchEmbeddableState | StoredSearchEmbeddableState): state is SearchEmbeddableByValueState | StoredSearchEmbeddableByValueState;
export declare function isSearchEmbeddableLegacyPanelState(state: SearchEmbeddablePanelApiState): state is SearchEmbeddableState;
