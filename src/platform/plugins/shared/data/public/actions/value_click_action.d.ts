import type { AggregateQuery } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
export type ValueClickActionContext = ValueClickContext;
export declare const ACTION_VALUE_CLICK = "ACTION_VALUE_CLICK";
export interface ValueClickContext {
    embeddable?: unknown;
    data: {
        data: Array<{
            table: Pick<Datatable, 'rows' | 'columns'>;
            column: number;
            row: number;
            value: any;
        }>;
        timeFieldName?: string;
        negate?: boolean;
        query?: AggregateQuery;
    };
}
export declare function createValueClickActionDefinition(getStartServices: () => {
    uiActions: UiActionsStart;
}): UiActionsActionDefinition<ValueClickContext>;
