import React from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type EuiTablePersistInjectedProps } from '@kbn/shared-ux-table-persist/src';
interface DataTableFormatProps {
    data: Datatable;
    uiSettings: IUiSettingsClient;
    fieldFormats: FieldFormatsStart;
    uiActions: UiActionsStart;
    isFilterable: (column: DatatableColumn) => boolean;
}
export declare const DataTableFormat: React.FC<import("@kbn/shared-ux-table-persist/src").HOCProps<DatatableRow, Omit<DataTableFormatProps & EuiTablePersistInjectedProps<DatatableRow>, "euiTablePersist">>>;
export {};
