import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { PublishesWritableUnifiedSearch, PublishesWritableDataViews, PublishesProjectRoutingOverrides } from '@kbn/presentation-publishing';
import type { PublishesWritableTimeRange } from '@kbn/presentation-publishing/interfaces/fetch/publishes_unified_search';
import type { DiscoverServices } from '../build_services';
import type { PublishesWritableSavedSearch, SearchEmbeddableSerializedAttributes, SearchEmbeddableStateManager } from './types';
export declare const initializeSearchEmbeddableApi: ({ initialState, dataLoading$, discoverServices, }: {
    initialState: SearchEmbeddableSerializedAttributes;
    dataLoading$: BehaviorSubject<boolean | undefined>;
    discoverServices: DiscoverServices;
}) => Promise<{
    api: PublishesWritableSavedSearch & PublishesWritableDataViews & Omit<PublishesWritableUnifiedSearch, keyof PublishesWritableTimeRange> & PublishesProjectRoutingOverrides;
    stateManager: SearchEmbeddableStateManager;
    anyStateChange$: Observable<void>;
    cleanup: () => void;
    reinitializeState: (lastSaved: SearchEmbeddableSerializedAttributes) => Promise<void>;
}>;
