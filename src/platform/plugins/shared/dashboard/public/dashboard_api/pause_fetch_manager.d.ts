import type { BehaviorSubject } from 'rxjs';
import type { initializeFiltersManager } from './filters_manager';
export declare function initializePauseFetchManager(filtersManager: ReturnType<typeof initializeFiltersManager>): {
    api: {
        isFetchPaused$: BehaviorSubject<boolean>;
        setFetchPaused: (paused: boolean) => void;
    };
    cleanup: () => void;
};
