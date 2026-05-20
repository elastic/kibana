import { BehaviorSubject, type Subject } from 'rxjs';
import type { Filter } from '@kbn/es-query';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';
export declare const initializeFiltersManager: (unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>, layoutManager: ReturnType<typeof initializeLayoutManager>, settingsManager: ReturnType<typeof initializeSettingsManager>, forcePublish$: Subject<void>) => {
    api: {
        filters$: BehaviorSubject<Filter[] | undefined>;
        publishedChildFilters$: BehaviorSubject<Filter[] | undefined>;
        unpublishedChildFilters$: BehaviorSubject<Filter[] | undefined>;
        childFiltersLoading$: import("rxjs").Observable<boolean>;
        publishFilters: () => void;
    };
    cleanup: () => void;
};
