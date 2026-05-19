import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { ActionInternal } from './actions/action_internal';
export type ActionRegistry = Map<string, () => Promise<ActionInternal>>;
export type TriggerToActionsRegistry = Map<string, string[]>;
export interface VisualizeFieldContext {
    fieldName: string;
    dataViewSpec: DataViewSpec;
    contextualFields?: string[];
    textBasedColumns?: DatatableColumn[];
    originatingApp?: string;
    query?: AggregateQuery;
}
export declare const ACTION_VISUALIZE_FIELD = "ACTION_VISUALIZE_FIELD";
export declare const ACTION_VISUALIZE_GEO_FIELD = "ACTION_VISUALIZE_GEO_FIELD";
export declare const ACTION_VISUALIZE_LENS_FIELD = "ACTION_VISUALIZE_LENS_FIELD";
export interface Trigger {
    /**
     * Unique name of the trigger as identified in `ui_actions` plugin trigger registry.
     */
    id: string;
    /**
     * User friendly name of the trigger.
     */
    title?: string;
    /**
     * A longer user friendly description of the trigger.
     */
    description?: string;
}
export type RowClickContext = Partial<EmbeddableApiContext> & {
    data: {
        /**
         * Row index, starting from 0, where user clicked.
         */
        rowIndex: number;
        table: Datatable;
        /**
         * Sorted list column IDs that were visible to the user. Useful when only
         * a subset of datatable columns should be used.
         */
        columns?: string[];
    };
};
