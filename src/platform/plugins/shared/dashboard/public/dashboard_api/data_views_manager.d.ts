import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
export declare function initializeDataViewsManager(children$: PublishingSubject<{
    [key: string]: DefaultEmbeddableApi;
}>): {
    api: {
        dataViews$: BehaviorSubject<DataView[] | undefined>;
    };
    cleanup: () => void;
};
