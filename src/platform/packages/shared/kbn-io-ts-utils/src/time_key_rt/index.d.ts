import * as rt from 'io-ts';
export declare const DateFromStringOrNumber: rt.Type<string, string | number, unknown>;
export declare const minimalTimeKeyRT: rt.TypeC<{
    time: rt.Type<string, string | number, unknown>;
    tiebreaker: rt.NumberC;
}>;
export type MinimalTimeKey = rt.TypeOf<typeof minimalTimeKeyRT>;
declare const timeKeyRT: rt.IntersectionC<[rt.TypeC<{
    time: rt.Type<string, string | number, unknown>;
    tiebreaker: rt.NumberC;
}>, rt.PartialC<{
    gid: rt.StringC;
    fromAutoReload: rt.BooleanC;
}>]>;
export type TimeKey = rt.TypeOf<typeof timeKeyRT>;
export interface UniqueTimeKey extends TimeKey {
    gid: string;
}
export {};
