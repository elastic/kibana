import type { Observable } from 'rxjs';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';
import type { ChromeState } from '../state/chrome_state';
export interface AppChangeHandlerDeps {
    currentAppId$: Observable<string | undefined>;
    stop$: Observable<void>;
    state: ChromeState;
    docTitle: ChromeDocTitle;
}
/**
 * Resets per-app chrome state when navigating between applications.
 * Global chrome state is intentionally preserved across app changes.
 */
export declare function setupAppChangeHandler({ currentAppId$, stop$, state, docTitle, }: AppChangeHandlerDeps): void;
