import * as rt from 'io-ts';
export interface DateBrand {
    readonly Date: unique symbol;
}
export type Date = rt.Branded<string, DateBrand>;
export declare const dateRt: rt.BrandC<rt.StringC, DateBrand>;
