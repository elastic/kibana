import * as rt from 'io-ts';
export interface InRangeBrand {
    readonly InRange: unique symbol;
}
export type InRange = rt.Branded<number, InRangeBrand>;
export declare const inRangeRt: (start: number, end: number) => rt.Type<number, number, unknown>;
export declare const inRangeFromStringRt: (start: number, end: number) => rt.Type<number, number, unknown>;
