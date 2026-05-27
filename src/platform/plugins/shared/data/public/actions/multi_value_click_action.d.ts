import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { BooleanRelation } from '@kbn/es-query';
import type { QueryStart } from '../query';
export type MultiValueClickActionContext = MultiValueClickContext;
export declare const ACTION_MULTI_VALUE_CLICK = "ACTION_MULTI_VALUE_CLICK";
export interface MultiValueClickContext {
    embeddable?: unknown;
    data: {
        data: Array<{
            cells: Array<{
                column: number;
                row: number;
            }>;
            table: Pick<Datatable, 'rows' | 'columns' | 'meta'>;
            relation?: BooleanRelation;
        }>;
        timeFieldName?: string;
        negate?: boolean;
    };
}
export declare function createMultiValueClickActionDefinition(getStartServices: () => {
    query: QueryStart;
}): UiActionsActionDefinition<MultiValueClickContext>;
