import * as t from 'io-ts';
/**
 * Types the DefaultArray<C> as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are type C
 */
export declare const DefaultArray: <C extends t.Mixed>(codec: C) => t.Type<t.TypeOf<C>[], t.TypeOf<C>[] | undefined, unknown>;
