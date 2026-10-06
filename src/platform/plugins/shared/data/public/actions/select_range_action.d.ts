import type { AggregateQuery } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
export interface SelectRangeActionContext {
    embeddable?: unknown;
    data: {
        table: Datatable;
        column: number;
        range: number[];
        timeFieldName?: string;
        query?: AggregateQuery;
    };
}
export declare const ACTION_SELECT_RANGE = "ACTION_SELECT_RANGE";
export declare function createSelectRangeActionDefinition(getStartServices: () => {
    uiActions: UiActionsStart;
}): UiActionsActionDefinition<SelectRangeActionContext>;
