import type { DataView } from './data_view';
/**
 * This is wrapped by `createFlattenHitWrapper` in order to provide a single cache to be
 * shared across all uses of this function. It is only exported here for use in mocks.
 *
 * @internal
 */
export declare function flattenHitWrapper<T>(dataView: DataView, metaFields?: {}, cache?: WeakMap<WeakKey, any>): (hit: Record<string, unknown[]>, deep?: boolean) => Record<string, unknown>;
