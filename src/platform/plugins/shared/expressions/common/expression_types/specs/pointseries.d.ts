import type { $Values } from '@kbn/utility-types';
import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import type { DatatableRow } from './datatable';
export declare const PointSeriesColumnNames: {
    readonly X: "x";
    readonly Y: "y";
    readonly COLOR: "color";
    readonly SIZE: "size";
    readonly TEXT: "text";
};
/**
 * Allowed column names in a PointSeries
 */
export type PointSeriesColumnName = $Values<typeof PointSeriesColumnNames>;
/**
 * Column in a PointSeries
 */
export interface PointSeriesColumn {
    type: 'number' | 'string';
    role: 'measure' | 'dimension';
    expression: string;
}
/**
 * Represents a collection of valid Columns in a PointSeries
 */
export type PointSeriesColumns = Record<PointSeriesColumnName, PointSeriesColumn> | {};
export type PointSeriesRow = DatatableRow;
/**
 * A `PointSeries` is a unique structure that represents dots on a chart.
 */
export type PointSeries = ExpressionValueBoxed<'pointseries', {
    columns: PointSeriesColumns;
    rows: PointSeriesRow[];
}>;
export declare const pointseries: ExpressionTypeDefinition<'pointseries', PointSeries>;
