export * from './data_types/logs/components';
export declare const LazySummaryColumn: import("react").ForwardRefExoticComponent<import("@elastic/eui/src/components/datagrid/data_grid_types").EuiDataGridCellValueElementProps & {
    row: import("@kbn/discover-utils").DataTableRecord;
    dataView: import("@kbn/data-views-plugin/common").DataView;
    fieldFormats: import("@kbn/field-formats-plugin/public").FieldFormatsStart;
    closePopover: () => void;
    isCompressed?: boolean;
    columnsMeta: import("@kbn/discover-utils").DataTableColumnsMeta | undefined;
} & {
    isTracesSummary?: boolean;
} & import("./data_types/logs/components").SummaryColumnFactoryDeps & import("react").RefAttributes<{}>>;
