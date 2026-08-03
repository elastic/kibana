import type { DatatableColumn, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
export interface DateHistogramParams {
    date: boolean;
    interval: number;
    intervalESValue: number;
    intervalESUnit: string;
    format: string;
    bounds?: {
        min: string | number;
        max: string | number;
    };
}
export interface HistogramParams {
    interval: number;
}
export interface FakeParams {
    defaultValue: string;
}
export type ExpressionValueXYDimension = ExpressionValueBoxed<'xy_dimension', {
    label: string;
    aggType: string;
    params: DateHistogramParams | HistogramParams | FakeParams | {};
    accessor: number | DatatableColumn;
    format: SerializedFieldFormat;
}>;
