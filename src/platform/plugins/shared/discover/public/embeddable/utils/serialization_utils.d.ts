import { type SerializedTimeRange, type SerializedTitles } from '@kbn/presentation-publishing';
import { type SavedSearch } from '@kbn/saved-search-plugin/common';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { SearchEmbeddablePanelApiState } from '../../../common/embeddable/types';
import type { DiscoverServices } from '../../build_services';
import type { SearchEmbeddableInputState, SearchEmbeddableRuntimeState } from '../types';
export declare const deserializeState: ({ serializedState, discoverServices, }: {
    serializedState: SearchEmbeddableInputState;
    discoverServices: DiscoverServices;
}) => Promise<SearchEmbeddableRuntimeState>;
export declare const serializeState: ({ uuid, initialState, savedSearch, serializeTitles, serializeTimeRange, serializeDynamicActions, savedObjectId, selectedTabId, embeddableTransformsEnabled, }: {
    uuid: string;
    initialState: SearchEmbeddableRuntimeState;
    savedSearch: SavedSearch;
    serializeTitles: () => SerializedTitles;
    serializeTimeRange: () => SerializedTimeRange;
    serializeDynamicActions: () => SerializedDrilldowns;
    savedObjectId?: string;
    selectedTabId?: string;
    embeddableTransformsEnabled: boolean;
}) => SearchEmbeddablePanelApiState;
