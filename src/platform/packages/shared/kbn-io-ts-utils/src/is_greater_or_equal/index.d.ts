import * as rt from 'io-ts';
export interface IsGreaterOrEqualBrand {
    readonly IsGreaterOrEqual: unique symbol;
}
export type IsGreaterOrEqual = rt.Branded<number, IsGreaterOrEqualBrand>;
export declare const isGreaterOrEqualRt: (value: number) => rt.BrandC<rt.NumberC, IsGreaterOrEqualBrand>;
