import type { History } from 'history';
import type { BehaviorSubject, Observable } from 'rxjs';
import type { AppUpdater, ToastsSetup } from '@kbn/core/public';
export interface KbnUrlTracker {
    /**
     * Callback to invoke when the app is mounted
     */
    appMounted: () => void;
    /**
     * Callback to invoke when the app is unmounted
     */
    appUnMounted: () => void;
    /**
     * Unregistering the url tracker. This won't reset the current state of the nav link
     */
    stop: () => void;
    setActiveUrl: (newUrl: string) => void;
    getActiveUrl: () => string;
    /**
     * Resets internal state to the last active url, discarding the most recent change
     */
    restorePreviousUrl: () => void;
}
/**
 * Listens to history changes and optionally to global state changes and updates the nav link url of
 * a given app to point to the last visited page within the app.
 *
 * This includes the following parts:
 * * When the app is currently active, the nav link points to the configurable default url of the app.
 * * When the app is not active the last visited url is set to the nav link.
 * * When a provided observable emits a new value, the state parameter in the url of the nav link is updated
 * as long as the app is not active.
 */
export declare function createKbnUrlTracker({ baseUrl, defaultSubUrl, storageKey, stateParams, navLinkUpdater$, toastNotifications, history, getHistory, storage, shouldTrackUrlUpdate, onBeforeNavLinkSaved, }: {
    /**
     * Base url of the current app. This will be used as a prefix for the
     * nav link in the side bar
     */
    baseUrl: string;
    /**
     * Default sub url for this app. If the app is currently active or no sub url is already stored in session storage and the app hasn't been visited yet, the nav link will be set to this url.
     */
    defaultSubUrl: string;
    /**
     * List of URL mapped states that should get updated even when the app is not currently active
     */
    stateParams: Array<{
        /**
         * Key of the query parameter containing the state
         */
        kbnUrlKey: string;
        /**
         * Observable providing updates to the state
         */
        stateUpdate$: Observable<unknown>;
    }>;
    /**
     * Key used to store the current sub url in session storage. This key should only be used for one active url tracker at any given time.
     */
    storageKey: string;
    /**
     * App updater subject passed into the application definition to change nav link url.
     */
    navLinkUpdater$: BehaviorSubject<AppUpdater>;
    /**
     * Toast notifications service to show toasts in error cases.
     */
    toastNotifications: ToastsSetup;
    /**
     * History object to use to track url changes. If this isn't provided, a local history instance will be created.
     */
    history?: History;
    /**
     * Lazily retrieve history instance
     */
    getHistory?: () => History;
    /**
     * Storage object to use to persist currently active url. If this isn't provided, the browser wide session storage instance will be used.
     */
    storage?: Storage;
    /**
     * Checks if pathname belongs to current app. It's used in history listener to define whether it's necessary to set pathname as active url or not.
     * The default implementation compares the app name to the first part of pathname. Consumers can override this function for more complex cases.
     *
     * @param {string} pathname A location's pathname which comes to history listener
     */
    shouldTrackUrlUpdate?: (pathname: string) => boolean;
    /**
     * Called when current subpath is about to be saved to sessionStorage for subsequent use as a nav link.
     * Use to mutate app's subpath before it is saved by returning a new subpath.
     */
    onBeforeNavLinkSaved?: (newNavLink: string) => string;
}): KbnUrlTracker;
