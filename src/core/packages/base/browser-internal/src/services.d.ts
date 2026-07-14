import type { MaybePromise } from '@kbn/utility-types';
/**
 * Base interface that all core service should implement
 *
 * @internal
 */
export interface CoreService<TSetup = void, TStart = void> {
    setup(...params: any[]): MaybePromise<TSetup>;
    start(...params: any[]): MaybePromise<TStart>;
    stop(): MaybePromise<void>;
}
