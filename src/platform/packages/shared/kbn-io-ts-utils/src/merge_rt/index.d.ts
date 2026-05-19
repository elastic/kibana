import * as t from 'io-ts';
type PlainObject = Record<string | number | symbol, any>;
type DeepMerge<T, U> = U extends PlainObject ? T extends PlainObject ? Omit<T, keyof U> & {
    [key in keyof U]: T extends {
        [k in key]: any;
    } ? DeepMerge<T[key], U[key]> : U[key];
} : U : U;
export type MergeType<T1 extends t.Any, T2 extends t.Any> = t.Type<DeepMerge<t.TypeOf<T1>, t.TypeOf<T2>>, DeepMerge<t.OutputOf<T1>, t.OutputOf<T2>>> & {
    _tag: 'MergeType';
    types: [T1, T2];
};
export declare function mergeRt<T1 extends t.Any, T2 extends t.Any>(a: T1, b: T2): MergeType<T1, T2>;
export {};
