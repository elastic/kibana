import type { CapabilitiesSwitcher } from '@kbn/core-capabilities-server';
import type { SwitcherWithId, SwitcherBucket } from './types';
/**
 * Returns true if the two globing paths can intersect.
 *
 * @example
 * ```ts
 * pathsIntersect('*', '*'); // true
 * pathsIntersect('*', 'foo.bar'); // true
 * pathsIntersect('foo.*', 'bar.*'); // false
 * ```
 *
 * @internal
 */
export declare const pathsIntersect: (pathA: string, pathB: string) => boolean;
/**
 * Splits the provided switchers into buckets so that switchers allocated
 * into a given buckets can all be executed in parallel.
 * (each switcher in a given bucket doesn't intersect with any other switcher of the same bucket)
 *
 * @internal
 */
export declare const splitIntoBuckets: (switchers: SwitcherWithId[]) => SwitcherBucket[];
/**
 * Aggregates all the switchers of the given bucket to a single switcher function.
 * Only works under the assumption that the switchers in the bucket don't intersect
 * (But that's the definition of a switcher bucket)
 *
 * @internal
 */
export declare const convertBucketToSwitcher: (bucket: SwitcherBucket) => CapabilitiesSwitcher;
