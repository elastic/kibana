import type { ComponentProps } from 'react';
import React from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { EuiDataGridRefProps, EuiDataGridControlColumn, EuiDataGridCustomBodyProps, EuiDataGridStyle, EuiDataGridProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { RowControlColumn } from '@kbn/discover-utils';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { UnifiedDataTableSettings, DataTableColumnsMeta, CustomCellRenderer, CustomGridColumnsConfiguration, DataGridPaginationMode, CustomBulkActions } from '../types';
import { DataGridDensity } from '../constants';
import type { UnifiedDataTableRenderCustomToolbar } from './custom_toolbar/render_custom_toolbar';
import { type ColorIndicatorControlColumnParams } from './custom_control_columns';
export type SortOrder = [string, string];
export declare enum DataLoadingState {
    loading = "loading",
    loadingMore = "loadingMore",
    loaded = "loaded"
}
export type RenderDocumentViewCallback = (hit: DataTableRecord, displayedRows: DataTableRecord[], displayedColumns: string[], columnsMeta?: DataTableColumnsMeta) => JSX.Element | undefined;
export interface RenderDocumentViewMeta {
    displayedRows: DataTableRecord[];
    displayedColumns: string[];
}
/**
 * Unified Data Table props
 */
interface InternalUnifiedDataTableProps {
    /**
     * Determines which element labels the grid for ARIA
     */
    ariaLabelledBy: string;
    /**
     * Optional class name to apply
     */
    className?: string;
    /**
     * Determines ids of the columns which are displayed
     */
    columns: string[];
    /**
     * If not provided, types will be derived by default from the dataView field types.
     * For displaying text-based search results, pass columns meta (which are available separately in the fetch request) down here.
     * Check available utils in `utils/get_columns_meta.ts`
     */
    columnsMeta?: DataTableColumnsMeta;
    /**
     * Field tokens could be rendered in column header next to the field name.
     */
    showColumnTokens?: boolean;
    /**
     * Set to true to allow users to drag and drop columns for reordering
     */
    canDragAndDropColumns?: boolean;
    /**
     * Optional value for providing configuration setting for UnifiedDataTable header row height
     */
    configHeaderRowHeight?: number;
    /**
     * Determines number of rows of a column header
     */
    headerRowHeightState?: number;
    /**
     * Update header row height state
     */
    onUpdateHeaderRowHeight?: (headerRowHeight: number) => void;
    /**
     * If set, the given document is displayed in a flyout
     */
    expandedDoc?: DataTableRecord;
    /**
     * The used data view
     */
    dataView: DataView;
    /**
     * Determines if data is currently loaded
     */
    loadingState: DataLoadingState;
    /**
     * Function to add a filter in the grid cell or document flyout
     */
    onFilter?: DocViewFilterFn;
    /**
     * Function triggered when a column is resized by the user, passes `undefined` for auto-width
     */
    onResize?: (colSettings: {
        columnId: string;
        width: number | undefined;
    }) => void;
    /**
     * Function to set all columns
     */
    onSetColumns: (columns: string[], hideTimeColumn: boolean) => void;
    /**
     * function to change sorting of the documents, skipped when isSortEnabled is set to false
     */
    onSort?: (sort: string[][]) => void;
    /**
     * Array of documents provided by Elasticsearch
     */
    rows?: DataTableRecord[];
    /**
     * Function to set the expanded document, which is displayed in a flyout
     */
    setExpandedDoc?: (doc?: DataTableRecord, options?: {
        initialTabId?: string;
    }) => void;
    /**
     * Grid display settings persisted in Elasticsearch (e.g. column width)
     */
    settings?: UnifiedDataTableSettings;
    /**
     * Search description
     */
    searchDescription?: string;
    /**
     * Search title
     */
    searchTitle?: string;
    /**
     * Determines whether the time columns should be displayed (legacy settings)
     */
    showTimeCol: boolean;
    /**
     * Determines whether the full screen button should be displayed
     */
    showFullScreenButton?: boolean;
    /**
     * Determines whether the keyboard shortcuts button should be displayed
     */
    showKeyboardShortcuts?: boolean;
    /**
     * Manage user sorting control
     */
    isSortEnabled?: boolean;
    /**
     * Current sort setting
     */
    sort: SortOrder[];
    /**
     * Manage pagination control
     */
    isPaginationEnabled?: boolean;
    /**
     * Manage pagination mode
     * @default 'multiPage'
     * "multiPage" - Regular pagination with numbers and arrows to control the page
     * "singlePage" - Hides the general pagination bar and shows Load more button at the bottom of the grid
     * "infinite" - Hides the general pagination bar and loads more data as the user scrolls [Not yet implemented]
     */
    paginationMode?: DataGridPaginationMode;
    /**
     * List of used control columns (available: 'openDetails', 'select')
     */
    controlColumnIds?: string[];
    /**
     * Optional value for providing configuration setting for UnifiedDataTable row height
     */
    configRowHeight?: number;
    /**
     * Row height from state
     */
    rowHeightState?: number;
    /**
     * Update row height state
     */
    onUpdateRowHeight?: (rowHeight: number) => void;
    /**
     * Density from state
     */
    dataGridDensityState?: DataGridDensity;
    /**
     * Callback when the data grid density configuration is modified
     */
    onUpdateDataGridDensity?: (dataGridDensity: DataGridDensity) => void;
    /**
     * Is text base lang mode enabled
     */
    isPlainRecord?: boolean;
    /**
     * Current state value for rowsPerPage
     */
    rowsPerPageState?: number;
    /**
     * Update rows per page state
     */
    onUpdateRowsPerPage?: (rowsPerPage: number) => void;
    /**
     *
     * this callback is triggered when user navigates to a different page
     *
     */
    onUpdatePageIndex?: (pageIndex: number) => void;
    /**
     * Configuration option to limit sample size slider
     */
    maxAllowedSampleSize?: number;
    /**
     * The max size of the documents returned by Elasticsearch
     */
    sampleSizeState: number;
    /**
     * Update rows per page state
     */
    onUpdateSampleSize?: (sampleSize: number) => void;
    /**
     * Callback to execute on edit runtime field
     */
    onFieldEdited?: (options: {
        editedDataView: DataView;
    }) => void;
    /**
     * Service dependencies
     */
    services: {
        theme: ThemeServiceStart;
        fieldFormats: FieldFormatsStart;
        uiSettings: IUiSettingsClient;
        dataViewFieldEditor?: DataViewFieldEditorStart;
        toastNotifications: ToastsStart;
        storage: Storage;
        data: DataPublicPluginStart;
    };
    /**
     * Accepts one of two types:
     * - Callback to render the document view when a document is expanded
     * - 'external' const to indicate the consumer will handle rendering
     *   the doc view themselves when a document is expanded
     */
    renderDocumentView?: RenderDocumentViewCallback | 'external';
    /**
     * Callback to set associated metadata when rendering the document view,
     * only used when {@link renderDocumentView} is set to `external`
     */
    setRenderDocumentViewMeta?: (meta: RenderDocumentViewMeta | undefined) => void;
    /**
     * Optional value for providing configuration setting for enabling to display the complex fields in the table. Default is true.
     */
    showMultiFields?: boolean;
    /**
     * Optional value for providing configuration setting for maximum number of document fields to display in the table. Default is 50.
     */
    maxDocFieldsDisplayed?: number;
    /**
     * @deprecated Use only `rowAdditionalLeadingControls` instead
     * Optional value for providing EuiDataGridControlColumn list of the additional leading control columns. UnifiedDataTable includes two control columns: Open Details and Select.
     */
    externalControlColumns?: EuiDataGridControlColumn[];
    /**
     * An optional list of the EuiDataGridControlColumn type for setting trailing control columns standard for EuiDataGrid.
     * We recommend to rather position all controls in the beginning of rows and use `rowAdditionalLeadingControls` for that
     * as number of columns can be dynamically changed and we don't want the controls to become hidden due to horizontal scroll.
     */
    trailingControlColumns?: EuiDataGridControlColumn[];
    /**
     * Optional value to extend the list of default row actions
     */
    rowAdditionalLeadingControls?: RowControlColumn[];
    /**
     * Number total hits from ES
     */
    totalHits?: number;
    /**
     * To fetch more
     */
    onFetchMoreRecords?: () => void;
    /**
     * Optional value for providing the additional controls available in the UnifiedDataTable toolbar to manage it's records or state. UnifiedDataTable includes Columns, Sorting and Bulk Actions.
     */
    externalAdditionalControls?: React.ReactNode;
    /**
     * Optional list of number type values to set custom UnifiedDataTable paging options to display the records per page.
     */
    rowsPerPageOptions?: number[];
    /**
     * An optional function called to completely customize and control the rendering of
     * EuiDataGrid's body and cell placement.  This can be used to, e.g. remove EuiDataGrid's
     * virtualization library, or roll your own.
     *
     * This component is **only** meant as an escape hatch for extremely custom use cases.
     *
     * Behind the scenes, this function is treated as a React component,
     * allowing hooks, context, and other React concepts to be used.
     * It receives #EuiDataGridCustomBodyProps as its only argument.
     */
    renderCustomGridBody?: (args: EuiDataGridCustomBodyProps) => React.ReactNode;
    /**
     * Optional render for the grid toolbar
     * @param toolbarProps
     * @param gridProps
     */
    renderCustomToolbar?: UnifiedDataTableRenderCustomToolbar;
    /**
     * Optional triggerId to retrieve the column cell actions that will override the default ones
     */
    cellActionsTriggerId?: string;
    /**
     * Custom set of properties used by some actions.
     * An action might require a specific set of metadata properties to render.
     * This data is sent directly to actions.
     */
    cellActionsMetadata?: Record<string, unknown>;
    /**
     * Controls whether the cell actions should replace the default cell actions or be appended to them
     */
    cellActionsHandling?: 'replace' | 'append';
    /**
     * An optional value for a custom number of the visible cell actions in the table. By default is up to 3.
     **/
    visibleCellActions?: number;
    /**
     * Disable cell actions for the table.
     */
    disableCellActions?: boolean;
    /**
     * An optional settings for a specified fields rendering like links. Applied only for the listed fields rendering.
     */
    externalCustomRenderers?: CustomCellRenderer;
    /**
     * An optional settings for customising the column
     */
    customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
    /**
     * Name of the UnifiedDataTable consumer component or application
     */
    consumer?: string;
    /**
     * Optional key/value pairs to set guided onboarding steps ids for a data table components included to guided tour.
     */
    componentsTourSteps?: Record<string, string>;
    /**
     * Optional gridStyle override.
     */
    gridStyleOverride?: EuiDataGridStyle;
    /**
     * Optional row line height override. Default is 1.6em.
     */
    rowLineHeightOverride?: string;
    /**
     * Set to true to allow users to compare selected documents
     */
    enableComparisonMode?: boolean;
    /**
     * Set to true to allow users to search in cell values
     */
    enableInTableSearch?: boolean;
    /**
     * Optional extra props passed to the renderCellValue function/component.
     */
    cellContext?: EuiDataGridProps['cellContext'];
    /**
     *
     * Custom cell Popover Render Component.
     *
     */
    renderCellPopover?: EuiDataGridProps['renderCellPopover'];
    /**
     * Disables the cell popover for the grid.
     */
    disableCellPopover?: boolean;
    /**
     * When specified, this function will be called to determine the color of the row indicator.
     * @param row
     */
    getRowIndicator?: ColorIndicatorControlColumnParams['getRowIndicator'];
    /**
     * Custom bulk action
     */
    customBulkActions?: CustomBulkActions;
    /**
     * When editing fields, it will create a new ad-hoc data view instead of modifying the existing one.
     */
    shouldKeepAdHocDataViewImmutable?: boolean;
    /**
     * Callback fired when full screen mode is toggled
     * @param isFullScreen - boolean indicating if the grid is in full screen mode
     */
    onFullScreenChange?: (isFullScreen: boolean) => void;
    /**
     * Set to true when the table is used in an embedded context (e.g., dashboards).
     * When true, filter actions on computed columns will be hidden.
     */
    hideFilteringOnComputedColumns?: boolean;
}
export declare const EuiDataGridMemoized: React.MemoExoticComponent<React.MemoExoticComponent<React.ForwardRefExoticComponent<EuiDataGridProps & React.RefAttributes<EuiDataGridRefProps>>>>;
export declare const UnifiedDataTable: React.ForwardRefExoticComponent<Omit<Omit<InternalUnifiedDataTableProps & React.RefAttributes<EuiDataGridRefProps>, "ref"> & {
    ref?: ((instance: EuiDataGridRefProps | null) => void | React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | React.RefObject<EuiDataGridRefProps> | null | undefined;
} & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<import("../restorable_state").UnifiedDataTableRestorableState>, "initialState" | "onInitialStateChange">, "ref"> & React.RefAttributes<EuiDataGridRefProps & import("@kbn/restorable-state").RestorableStateProviderApi>>;
export type UnifiedDataTableProps = ComponentProps<typeof UnifiedDataTable>;
export {};
