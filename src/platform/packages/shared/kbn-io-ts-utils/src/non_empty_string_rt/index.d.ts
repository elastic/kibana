import * as t from 'io-ts';
export interface NonEmptyStringBrand {
    readonly NonEmptyString: unique symbol;
}
export type NonEmptyString = t.Branded<string, NonEmptyStringBrand>;
export declare const nonEmptyStringRt: t.BrandC<t.StringC, NonEmptyStringBrand>;
