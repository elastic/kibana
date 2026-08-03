import type { AppUpdater, CoreSetup, ScopedHistory } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import type { DiscoverSetupPlugins } from '../types';
/**
 * It creates the kbn url tracker for Discover to listens to history changes and optionally to global state
 * changes and updates the nav link url of to point to the last visited page
 */
export declare function initializeKbnUrlTracking({ baseUrl, core, navLinkUpdater$, plugins, getScopedHistory, }: {
    baseUrl: string;
    core: CoreSetup;
    navLinkUpdater$: BehaviorSubject<AppUpdater>;
    plugins: DiscoverSetupPlugins;
    getScopedHistory: () => ScopedHistory<unknown>;
}): {
    appMounted: () => void;
    appUnMounted: () => void;
    stopUrlTracker: () => void;
    setTrackedUrl: (newUrl: string) => void;
    restorePreviousUrl: () => void;
    setTrackingEnabled: (value: boolean) => void;
};
