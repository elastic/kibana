import type { IUiSettingsClient } from '@kbn/core/public';
import type { InspectorViewDescription } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';
export declare const getTableViewDescription: (getStartServices: () => {
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    isFilterable: (column: DatatableColumn) => boolean;
    uiSettings: IUiSettingsClient;
}) => InspectorViewDescription;
