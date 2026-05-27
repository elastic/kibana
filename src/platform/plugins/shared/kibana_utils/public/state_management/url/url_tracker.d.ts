import type { History } from 'history';
export interface IUrlTracker {
    startTrackingUrl: (history?: History) => () => void;
    getTrackedUrl: () => string | null;
    trackUrl: (url: string) => void;
}
/**
 * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
 * Persists the url in sessionStorage so it could be restored if navigated back to the app
 */
export declare function createUrlTracker(key: string, storage?: Storage): IUrlTracker;
