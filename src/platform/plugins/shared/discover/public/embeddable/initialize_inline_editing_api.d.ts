import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { DiscoverSessionTab, SavedSearch } from '@kbn/saved-search-plugin/common/types';
import { type PublishingSubject } from '@kbn/presentation-publishing';
import type { SearchEmbeddableSerializedAttributes, SearchEmbeddableStateManager } from './types';
interface SearchEmbeddableDeps {
    api: {
        savedSearch$: PublishingSubject<SavedSearch>;
    };
    reinitializeState: (state: SearchEmbeddableSerializedAttributes) => Promise<void>;
    stateManager: SearchEmbeddableStateManager;
}
export interface InlineEditingApi {
    anyStateChange$: Observable<undefined>;
    draftSelectedTabId$: BehaviorSubject<string | undefined>;
    inlineEditDirty$: BehaviorSubject<boolean>;
    isInlineEditing$: BehaviorSubject<boolean>;
    overrideHoverActions$: BehaviorSubject<boolean>;
    applyInlineTabSelection: () => Promise<void>;
    cancelInlineTabSelection: () => Promise<void>;
    isEditing: () => boolean;
    previewInlineTabSelection: (tabId: string) => Promise<void>;
    startInlineEditing: () => Promise<void>;
    stopInlineEditing: () => void;
}
export declare const initializeInlineEditingApi: ({ uuid, parentApi, tabs, analytics, selectedTabId$, savedObjectId$, searchEmbeddable, blockingError$, dataLoading$, }: {
    uuid: string;
    parentApi: unknown;
    tabs: DiscoverSessionTab[];
    analytics: AnalyticsServiceStart;
    selectedTabId$: BehaviorSubject<string | undefined>;
    savedObjectId$: BehaviorSubject<string | undefined>;
    searchEmbeddable: SearchEmbeddableDeps;
    blockingError$: BehaviorSubject<Error | undefined>;
    dataLoading$: BehaviorSubject<boolean | undefined>;
}) => InlineEditingApi;
export {};
