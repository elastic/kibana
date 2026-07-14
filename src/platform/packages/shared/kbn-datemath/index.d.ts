import moment from 'moment';
export type Unit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';
export type UnitsMap = {
    [k in Unit]: {
        weight: number;
        type: 'calendar' | 'fixed' | 'mixed';
        base: number;
    };
};
export declare const unitsMap: UnitsMap;
export declare const units: Unit[];
export declare const unitsDesc: Unit[];
export declare const unitsAsc: Unit[];
export declare function parse(input: string, options?: {
    roundUp?: boolean;
    momentInstance?: typeof moment;
    forceNow?: Date;
}): moment.Moment | undefined;
declare const _default: {
    parse: typeof parse;
    unitsMap: Readonly<UnitsMap>;
    units: readonly Unit[];
    unitsAsc: readonly Unit[];
    unitsDesc: readonly Unit[];
};
export default _default;
