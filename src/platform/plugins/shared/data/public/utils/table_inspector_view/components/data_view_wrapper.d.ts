import React from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common/expression_types/specs';
export declare const getDataViewComponentWrapper: (getStartServices: () => {
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
    isFilterable: (column: DatatableColumn) => boolean;
}) => (props: any) => React.JSX.Element;
