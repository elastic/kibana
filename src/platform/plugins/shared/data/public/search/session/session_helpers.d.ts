import type { ISessionService } from './session_service';
import { SearchSessionState } from './search_session_state';
/**
 * Options for {@link waitUntilNextSessionCompletes$}
 */
export interface WaitUntilNextSessionCompletesOptions {
    /**
     * For how long to wait between session state transitions before considering that session completed
     */
    waitForIdle?: number;
}
/**
 * Creates an observable that emits when next search session completes.
 * This utility is helpful to use in the application to delay some tasks until next session completes.
 *
 * @param sessionService - {@link ISessionService}
 * @param opts - {@link WaitUntilNextSessionCompletesOptions}
 */
export declare function waitUntilNextSessionCompletes$(sessionService: ISessionService, { waitForIdle }?: WaitUntilNextSessionCompletesOptions): import("rxjs").Observable<SearchSessionState.Completed | SearchSessionState.BackgroundCompleted>;
