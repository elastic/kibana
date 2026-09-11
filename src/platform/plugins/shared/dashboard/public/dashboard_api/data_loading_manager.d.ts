import type { BehaviorSubject } from 'rxjs';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
export declare function initializeDataLoadingManager(children$: PublishingSubject<{
    [key: string]: DefaultEmbeddableApi;
}>): {
    api: {
        dataLoading$: BehaviorSubject<boolean | undefined>;
    };
    internalApi: {
        waitForPanelsToLoad$: import("rxjs").Observable<void>;
    };
    cleanup: () => void;
};
