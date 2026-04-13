/**
 * Deeply merges two objects, omitting undefined values, and not deeply merging Arrays.
 *
 * @remarks
 * Should behave identically to lodash.merge, however it will not merge Array values like lodash does.
 * Any properties with `undefined` values on both objects will be ommitted from the returned object.
 */
export declare function merge<TBase extends Record<string, any>, TSource1 extends Record<string, any>>(baseObj: TBase, source1: TSource1): TBase & TSource1;
export declare function merge<TBase extends Record<string, any>, TSource1 extends Record<string, any>, TSource2 extends Record<string, any>>(baseObj: TBase, overrideObj: TSource1, overrideObj2: TSource2): TBase & TSource1 & TSource2;
export declare function merge<TBase extends Record<string, any>, TSource1 extends Record<string, any>, TSource2 extends Record<string, any>, TSource3 extends Record<string, any>>(baseObj: TBase, overrideObj: TSource1, overrideObj2: TSource2): TBase & TSource1 & TSource2 & TSource3;
