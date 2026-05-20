import { type UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
export declare function getTriggerConstant(type: string): "VISUALIZE_FIELD_TRIGGER" | "VISUALIZE_GEO_FIELD_TRIGGER";
export declare function triggerVisualizeActions(uiActions: UiActionsStart, field: DataViewField, contextualFields: string[] | undefined, originatingApp: string, dataView?: DataView): void;
export declare function triggerVisualizeActionsTextBasedLanguages(uiActions: UiActionsStart, contextualFields: string[], originatingApp: string, dataView?: DataView, query?: AggregateQuery): void;
export interface VisualizeInformation {
    field: DataViewField;
    href?: string;
}
/**
 * Returns the field name and potentially href of the field or the first multi-field
 * that has a compatible visualize uiAction.
 */
export declare function getVisualizeInformation(uiActions: UiActionsStart, field: DataViewField, dataView: DataView | undefined, contextualFields?: string[], multiFields?: DataViewField[]): Promise<VisualizeInformation | undefined>;
