import { ES_FIELD_TYPES } from '../../../../types';
interface IntervalValuesRange {
    min: number;
    max: number;
}
export interface CalculateHistogramIntervalParams {
    interval: number | string;
    maxBucketsUiSettings: number;
    maxBucketsUserInput?: number | '';
    esTypes: ES_FIELD_TYPES[];
    intervalBase?: number;
    values?: IntervalValuesRange;
}
export declare const calculateHistogramInterval: ({ interval, maxBucketsUiSettings, maxBucketsUserInput, intervalBase, values, esTypes, }: CalculateHistogramIntervalParams) => number;
export {};
