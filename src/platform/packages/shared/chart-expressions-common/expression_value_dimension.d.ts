import type { DatatableColumn, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export type ExpressionValueVisDimension = ExpressionValueBoxed<'vis_dimension', {
    accessor: number | DatatableColumn;
    format: {
        id?: string;
        params?: Record<string, any>;
    };
}>;
