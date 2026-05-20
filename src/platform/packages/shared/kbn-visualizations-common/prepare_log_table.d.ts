import type { Datatable, DimensionType } from '@kbn/expressions-plugin/common/expression_types/specs';
import type { ExpressionValueVisDimension, ExpressionValueXYDimension } from '@kbn/chart-expressions-common';
type DimensionColumn = ExpressionValueVisDimension | ExpressionValueXYDimension | string;
export type Dimension = [DimensionColumn[] | undefined, string];
export type LayerDimension = [DimensionColumn[] | undefined, string, DimensionType];
export declare const prepareLogTable: (datatable: Datatable, dimensions: LayerDimension[] | Dimension[], removeUnmappedColumns?: boolean) => {
    columns: {
        meta: {
            dimensionType?: string;
            dimensionName: string | undefined;
            type: import("@kbn/expressions-plugin/common/expression_types/specs").DatatableColumnType;
            esType?: string;
            field?: string;
            index?: string;
            params?: import("@kbn/field-formats-plugin/common").SerializedFieldFormat;
            source?: string;
            sourceParams?: import("@kbn/utility-types").SerializableRecord;
        };
        id: string;
        name: string;
        isNull?: boolean;
        isComputedColumn?: boolean;
        variable?: string;
    }[];
    type: "datatable";
    meta?: import("@kbn/expressions-plugin/common/expression_types/specs").DatatableMeta;
    rows: import("@kbn/expressions-plugin/common/expression_types/specs").DatatableRow[];
    warning?: string;
};
export {};
