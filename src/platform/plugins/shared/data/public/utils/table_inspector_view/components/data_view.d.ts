import React, { Component } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { InspectorViewProps, Adapters } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { TablesAdapter, Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
interface DataViewComponentState {
    datatable: Datatable;
    adapters: Adapters;
}
interface DataViewComponentProps extends InspectorViewProps {
    uiSettings: IUiSettingsClient;
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    isFilterable: (column: DatatableColumn) => boolean;
    options: {
        fileName?: string;
    };
}
declare class DataViewComponent extends Component<DataViewComponentProps, DataViewComponentState> {
    state: DataViewComponentState;
    static getDerivedStateFromProps(nextProps: Readonly<DataViewComponentProps>, state: DataViewComponentState): {
        adapters: Adapters;
        datatable: any;
    } | null;
    onUpdateData: (tables: TablesAdapter["tables"]) => void;
    selectTable: (datatable: Datatable) => void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    static renderNoData(): React.JSX.Element;
    render(): React.JSX.Element;
}
export default DataViewComponent;
