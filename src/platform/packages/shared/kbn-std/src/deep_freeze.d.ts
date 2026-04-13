import type { RecursiveReadonly } from '@kbn/utility-types';
/** @public */
export type Freezable = {
    [k: string]: any;
} | any[];
/**
 * Apply Object.freeze to a value recursively and convert the return type to
 * Readonly variant recursively
 *
 * @public
 */
export declare function deepFreeze<T extends Freezable>(object: T): RecursiveReadonly<T>;
