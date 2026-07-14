import { type Observable } from 'rxjs';
import type { NotificationCoordinatorState, NotificationCoordinatorPublicApi } from '@kbn/core-notifications-browser';
export declare class Coordinator {
    private readonly coordinationLock$;
    lock$: Observable<NotificationCoordinatorState>;
    acquireLock(owner: string): void;
    releaseLock(owner: string): void;
    /**
     * @description This method is used to control the flow of notifications, it will automatically acquire
     * a lock for the registered entity and buffer new values to be emitted when the provided condition is not met.
     * Also when the passed observable has been emptied if the current lock still belongs to the registrar it will be released automatically, however an acquired lock can
     * also be released as deemed fit using {@link releaseLock}.
     * @param registrar - A unique identifier for the caller of this method
     * @param $ - Observable to be controlled
     * @param cond - Condition under which updates from the provided observable should be emitted
     */
    optInToCoordination<T extends Array<{
        id: string;
    }>>(registrar: string, $: Observable<T>, cond: (coordinatorState: NotificationCoordinatorState) => boolean): Observable<T>;
}
export declare function notificationCoordinator(this: Coordinator, registrar: string): NotificationCoordinatorPublicApi;
