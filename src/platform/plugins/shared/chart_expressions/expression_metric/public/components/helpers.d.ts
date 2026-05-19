import { type CustomPaletteState } from '@kbn/charts-plugin/common';
import { type PaletteOutput } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
export interface FormatOverrides {
    number?: {
        alwaysShowSign?: boolean;
    };
    percent?: {
        alwaysShowSign?: boolean;
    };
    bytes?: {
        alwaysShowSign?: boolean;
    };
}
export declare const getMetricFormatter: (accessor: ExpressionValueVisDimension | string, columns: Datatable["columns"], formatOverrides?: FormatOverrides | undefined) => import("@kbn/field-formats-plugin/common").TextContextTypeConvert;
export declare const getColor: (value: number, palette: PaletteOutput<CustomPaletteState>, accessors: {
    metric: string;
    max?: string;
    breakdownBy?: string;
}, data: Datatable, rowNumber: number) => string | undefined;
