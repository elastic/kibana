import { ValueFormatConfig, LensColorConfig } from "./types";

export interface LensBaseOperation {
    type: string;
    normalizeUnit?: string;
    filter?: string;
    timeScale?: string;
    label?: string;
    format?: ValueFormatConfig;
    scale?: 'ordinal' | 'interval' | 'ratio' | 'nominal';
    color?: LensColorConfig;
}

export interface LensSimpleOperation extends LensBaseOperation {
    type: 'count';
}

export interface LensStaticValueOperation extends LensBaseOperation {
    type: 'static_value';
    value: string | number;
}

export interface LensFieldOperation extends LensBaseOperation {
    type: 'avg' | 'max' | 'min' | 'sum' | 'median' | 'stddev' | 'variance' | 'cardinality';
    field: string;
}
    

export interface LensExtraOperation extends LensBaseOperation {
    type: 'extra';
    field: string;
    param: string;
}

export type LensOperation = LensFieldOperation | LensExtraOperation | LensSimpleOperation | LensStaticValueOperation;
