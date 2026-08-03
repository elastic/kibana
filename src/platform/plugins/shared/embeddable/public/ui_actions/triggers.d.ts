import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { RowClickContext } from '@kbn/ui-actions-plugin/public';
import type { BooleanRelation } from '@kbn/es-query';
export type ValueClickContext = Partial<EmbeddableApiContext> & {
    data: {
        data: Array<{
            table: Pick<Datatable, 'rows' | 'columns'>;
            column: number;
            row: number;
            value: any;
        }>;
        timeFieldName?: string;
        negate?: boolean;
    };
};
export type MultiValueClickContext = Partial<EmbeddableApiContext> & {
    data: {
        data: Array<{
            table: Pick<Datatable, 'rows' | 'columns'>;
            cells: Array<{
                column: number;
                row: number;
            }>;
            relation?: BooleanRelation;
        }>;
        timeFieldName?: string;
        negate?: boolean;
    };
};
export type CellValueContext = Partial<EmbeddableApiContext> & {
    data: Array<{
        value?: any;
        eventId?: string;
        columnMeta?: DatatableColumnMeta;
    }>;
};
export type RangeSelectContext = Partial<EmbeddableApiContext> & {
    data: {
        table: Datatable;
        column: number;
        range: number[];
        timeFieldName?: string;
    };
};
export type ChartActionContext = ValueClickContext | MultiValueClickContext | RangeSelectContext | RowClickContext;
export declare const isValueClickTriggerContext: (context: ChartActionContext) => context is ValueClickContext;
export declare const isMultiValueClickTriggerContext: (context: ChartActionContext) => context is MultiValueClickContext;
export declare const isRangeSelectTriggerContext: (context: ChartActionContext) => context is RangeSelectContext;
export declare const isRowClickTriggerContext: (context: ChartActionContext) => context is RowClickContext;
