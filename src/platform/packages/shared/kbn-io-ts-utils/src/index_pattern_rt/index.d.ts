import * as rt from 'io-ts';
export declare const isEmptyString: (value: string) => value is "";
export declare const containsSpaces: (value: string) => boolean;
export declare const containsEmptyEntries: (value: string) => boolean;
export declare const validateIndexPattern: (indexPattern: string) => boolean;
export interface IndexPatternBrand {
    readonly IndexPattern: unique symbol;
}
export type IndexPattern = rt.Branded<string, IndexPatternBrand>;
export declare const indexPatternRt: rt.BrandC<rt.StringC, IndexPatternBrand>;
