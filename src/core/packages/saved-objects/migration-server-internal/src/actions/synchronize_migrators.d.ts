import type * as TaskEither from 'fp-ts/TaskEither';
import type { WaitGroup } from '../kibana_migrator_utils';
/** @internal */
export interface SynchronizationFailed {
    type: 'synchronization_failed';
    error: Error;
}
/** @internal */
export interface SynchronizationSuccessful<T> {
    type: 'synchronization_successful';
    data: T[];
}
/** @internal */
export interface SynchronizeMigratorsParams<T> {
    waitGroup: WaitGroup<T>;
    payload?: T;
}
export declare function synchronizeMigrators<T>({ waitGroup, payload, }: SynchronizeMigratorsParams<T>): TaskEither.TaskEither<SynchronizationFailed, SynchronizationSuccessful<T>>;
