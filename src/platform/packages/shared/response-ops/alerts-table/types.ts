/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  JSX,
  ComponentClass,
  ComponentProps,
  ComponentType,
  Dispatch,
  FC,
  Key,
  MutableRefObject,
  ReactNode,
  RefAttributes,
} from 'react';
import type {
  AlertConsumers,
  ALERT_CASE_IDS,
  ALERT_STATUS,
  ALERT_MAINTENANCE_WINDOW_IDS,
} from '@kbn/rule-data-utils';
import type { HttpStart } from '@kbn/core-http-browser';
import type { EsQuerySnapshot, LegacyField } from '@kbn/alerting-types';
import type {
  EuiDataGridColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridControlColumn,
  EuiDataGridOnColumnResizeHandler,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridSorting,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import type {
  MappingRuntimeFields,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { BrowserFields } from '@kbn/alerting-types';
import type { SetRequired } from 'type-fest';
import type { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Alert } from '@kbn/alerting-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldBrowserOptions } from '@kbn/response-ops-alerts-fields-browser';
import type { MutedAlerts } from '@kbn/response-ops-alerts-apis/types';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import type { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
import type { Case } from './apis/bulk_get_cases';

export interface Consumer {
  id: AlertConsumers;
  name: string;
}

export type AlertsTableSupportedConsumers = Exclude<AlertConsumers, 'alerts' | 'streams'>;

export type CellComponent = NonNullable<AlertsTableProps['renderCellValue']>;

export type CellComponentProps = ComponentProps<CellComponent>;

export interface SystemCellComponentMap {
  [ALERT_STATUS]: CellComponent;
  [ALERT_CASE_IDS]: CellComponent;
  [ALERT_MAINTENANCE_WINDOW_IDS]: CellComponent;
}

export type SystemCellId = keyof SystemCellComponentMap;

type UseCasesAddToNewCaseFlyout = (props?: Record<string, unknown> & { onSuccess: () => void }) => {
  open: ({ attachments }: { attachments: any[] }) => void;
  close: () => void;
};

type UseCasesAddToExistingCaseModal = (
  props?: Record<string, unknown> & { onSuccess: () => void }
) => {
  open: ({
    getAttachments,
  }: {
    getAttachments: ({ theCase }: { theCase?: { id: string } }) => any[];
  }) => void;
  close: () => void;
};

export interface Ecs {
  _id: string;
  _index?: string;
  signal?: {
    [x: string]: any;
  };
  kibana?: {
    alert: any;
  };
}

/**
 * Minimal cases service interface required by the alerts table
 *
 * We don't use the full cases service interface to avoid circular dependencies
 */
export interface CasesService {
  ui: {
    getCasesContext: () => FC<any>;
  };
  hooks: {
    useCasesAddToNewCaseFlyout: UseCasesAddToNewCaseFlyout;
    useCasesAddToExistingCaseModal: UseCasesAddToExistingCaseModal;
  };
  helpers: {
    groupAlertsByRule: (items: any[]) => any[];
    canUseCases: (owners: Array<'securitySolution' | 'observability' | 'cases'>) => any;
    getRuleIdFromEvent: (event: { data: any[]; ecs: Ecs }) => { id: string; name: string };
  };
}

interface AlertsTableEmptyState {
  /**
   * The message title for the empty state prompt
   */
  messageTitle?: string;
  /**
   * The message body for the empty state prompt
   */
  messageBody?: string;
  /**
   * The height variant for the empty state prompt
   */
  height?: 'tall' | 'short' | 'flex';
  /**
   * The style variant for the empty state prompt.
   *
   * `subdued` shows a subtle background color and with a distinct centered panel.
   * `transparent` shows a transparent background and a less prominent center panel.
   * @default `subdued`
   */
  variant?: 'subdued' | 'transparent';
}

type MergeProps<T, AP> = T extends (args: infer Props) => unknown
  ? (args: Props & AP) => ReactNode
  : T extends ComponentClass<infer Props>
  ? ComponentClass<Props & AP>
  : never;

export interface AlertWithLegacyFormats {
  alert: Alert;
  /**
   * @deprecated
   */
  legacyAlert: LegacyField[];
  /**
   * @deprecated
   */
  ecsAlert: any;
}

export interface AlertsTableOnLoadedProps {
  alerts: Alert[];
  columns: EuiDataGridColumn[];
  totalAlertsCount: number;
}

export interface AlertsTableSortCombinations {
  [field: string]: {
    order: 'asc' | 'desc';
  };
}

export interface AlertsTableProps<AC extends AdditionalContext = AdditionalContext>
  extends PublicAlertsDataGridProps {
  /**
   * A unique identifier used to persist the table state in localStorage
   */
  id: string;
  /**
   * The columns to be displayed in the table (row selection checkboxes
   * and actions column are prepended automatically)
   */
  columns?: EuiDataGridProps['columns'];
  /**
   * Columns change callback
   *
   * This is a controllable state: provide a non-undefined value and this onChange
   * callback to control it, otherwise the table will manage it internally.
   */
  onColumnsChange?: (newColumns: EuiDataGridProps['columns']) => void;
  /**
   * An array of column ids to show in the table
   */
  visibleColumns?: string[];
  /**
   * Visible columns change callback.
   *
   * This is a controllable state: provide a non-undefined value and this onChange
   * callback to control it, otherwise the table will manage it internally.
   */
  onVisibleColumnsChange?: (newVisibleColumns: string[]) => void;
  /**
   * A boolean expression or list of ids to refine the alerts search query
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  /**
   * The sort configuration.
   *
   * This is a controllable state: provide a non-undefined value to control it, otherwise
   * the table will manage it internally.
   */
  sort?: AlertsTableSortCombinations[];
  /**
   * Sort change callback
   */
  onSortChange?: (newSort: AlertsTableSortCombinations[]) => void;
  /**
   * The page size. Allowed values are 10, 20, 50, 100.
   *
   * This is a controllable state: provide a non-undefined value to control it, otherwise
   * the table will manage it internally.
   */
  pageSize?: number;
  /**
   * Page size change callback
   */
  onPageSizeChange?: (newPageSize: number) => void;
  /**
   * The page index, starting from 0.
   *
   * This is a controllable state: provide a non-undefined value to control it, otherwise
   * the table will manage it internally.
   */
  pageIndex?: number;
  /**
   * Page index change callback
   */
  onPageIndexChange?: (newPageIndex: number) => void;
  /**
   * Alert document fields available to be displayed in the table as columns
   *
   * If provided, the table will not fetch fields from the alerts index and
   * use these instead.
   */
  browserFields?: BrowserFields;
  /**
   * Update callback fired when any render context prop is changed
   *
   * Suitable to extract updated alerts information and other context properties
   */
  onUpdate?: (context: RenderContext<AC>) => void;
  /**
   * Callback fired when the alerts have been first loaded
   */
  onLoaded?: (props: AlertsTableOnLoadedProps) => void;
  /**
   * Any runtime mappings to be applied to the alerts search request
   */
  runtimeMappings?: MappingRuntimeFields;
  /**
   * Toggles the built-in alert status column visibility
   */
  showAlertStatusWithFlapping?: boolean;
  /**
   * Customizations to the data grid toolbar
   */
  toolbarVisibility?: EuiDataGridToolBarVisibilityOptions;
  /**
   * Allows to consumers of the table to decide to highlight a row based on the current alert.
   */
  shouldHighlightRow?: (alert: Alert) => boolean;
  /**
   * Enable when rows may have variable heights (disables virtualization)
   */
  dynamicRowHeight?: boolean;

  emptyState?: AlertsTableEmptyState;

  errorState?: AlertsTableEmptyState & {
    onResetToPreviousState?: () => void;
  };
  /**
   * If true, the links in default cells, flyout and row actions will open in a new tab
   * @default false
   */
  openLinksInNewTab?: boolean;
  /**
   * An object used to compose the render context passed to all render functions as part of their
   * props
   */
  additionalContext?: AC;
  /**
   * Cell content render function
   */
  renderCellValue?: MergeProps<
    EuiDataGridProps['renderCellValue'],
    RenderContext<AC> & AlertWithLegacyFormats
  >;
  /**
   * Cell popover render function
   */
  renderCellPopover?: MergeProps<
    EuiDataGridProps['renderCellPopover'],
    RenderContext<AC> & { alert: Alert }
  >;
  /**
   * Actions cell render function
   */
  renderActionsCell?: MergeProps<
    EuiDataGridControlColumn['rowCellRender'],
    RenderContext<AC> &
      AlertWithLegacyFormats & { setIsActionLoading?: (isLoading: boolean) => void }
  >;
  /**
   * Additional toolbar controls render function
   */
  renderAdditionalToolbarControls?: ComponentRenderer<AC>;
  /**
   * The index of the alert to be displayed in the expanded view (i.e. flyout).
   *
   * This pagination crosses the table page boundaries, so if you have a page size of 20,
   * and you set this value to 21, the table will automatically switch to page 2.
   *
   * If `null` or `undefined`, the expanded view is closed.
   *
   * This is a controllable state: provide a non-undefined value to control it, otherwise
   * the table will manage it internally.
   *
   * @example
   * ```tsx
   * export const AlertsTableWithExpandedView = () => {
   *   const [expandedAlertIndex, setExpandedAlertIndex] = useState<number | null>(null);
   *
   *   return (
   *     <AlertsTable
   *       ...
   *       expandedAlertIndex={expandedAlertIndex}
   *       onExpandedAlertIndexChange={setExpandedAlertIndex}
   *       ...
   *     />
   *   );
   * };
   * ```
   */
  expandedAlertIndex?: number | null;
  /**
   * Callback for expanded alert index changes
   *
   * The expanded alert index can be set to `null` to close the expanded view.
   * To open a row of the alerts table in the expanded view, set this value to the corresponding
   * `rowIndex`.
   */
  onExpandedAlertIndexChange?: (expandedAlertIndex: number | null) => void;
  /**
   * Renders the expanded alert. If undefined, a default flyout will be used. If null, no expanded
   * view will be rendered.
   *
   * The expanded alert can be retrieved from the `alerts` array by converting `expandedAlertIndex`
   * into a page-relative index (i.e. if expandedAlertIndex = 20 and pageSize = 20, the
   * corresponding `alerts` array index is 0).
   *
   * @example
   * ```tsx
   * export const AlertDetailFlyout: GetAlertsTableProp<'renderExpandedAlertView'> = ({
   *   pageSize,
   *   pageIndex,
   *   expandedAlertIndex,
   *   isLoading,
   *   alerts,
   * }) => {
   *   const alertIndexInPage = expandedAlertIndex - pageIndex * pageSize;
   *   // This can be undefined when a new page of alerts is still loading
   *   // Use this in combination with isLoading to show a loading indicator
   *   const alert = alerts[alertIndexInPage] as Alert | undefined;
   *
   *   render (...);
   * };
   * ```
   */
  renderExpandedAlertView?: ComponentType<
    Omit<RenderContext<AC>, 'expandedAlertIndex'> & { expandedAlertIndex: number }
  > | null;
  /**
   * Timestamp of the last data refetch request
   */
  lastReloadRequestTime?: number;
  /**
   * A storage provider where to persist the table configuration
   * @default new LocalStorageWrapper(window.localStorage)
   */
  configurationStorage?: IStorageWrapper | null;
  /**
   * Dependencies
   */
  services: {
    data: DataPublicPluginStart;
    http: HttpStart;
    notifications: NotificationsStart;
    fieldFormats: FieldFormatsStart;
    application: ApplicationStart;
    licensing: LicensingPluginStart;
    settings: SettingsStart;
    /**
     * The cases service is optional: cases features will be disabled if not provided
     */
    cases?: CasesService;
  };
}

/**
 * A utility type to extract the type of a prop from `AlertsTableProps`, excluding `undefined`.
 */
export type GetAlertsTableProp<PropKey extends keyof AlertsTableProps> = NonNullable<
  AlertsTableProps[PropKey]
>;

export interface AlertsTableImperativeApi {
  refresh: () => void;
  toggleColumn: (columnId: string) => void;
}

export type AlertsTablePropsWithRef<AC extends AdditionalContext> = AlertsTableProps<AC> &
  RefAttributes<AlertsTableImperativeApi>;

// Intentional empty interface since using `object` is too permissive
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AdditionalContext {}

export type RenderContext<AC extends AdditionalContext> = {
  tableId?: string;
  dataGridRef: MutableRefObject<EuiDataGridRefProps | null>;

  /**
   * Refetches all the queries, resetting the alerts pagination if necessary
   */
  refresh: () => void;

  /**
   * True if any of the active queries is fetching
   */
  isLoading: boolean;

  isLoadingAlerts: boolean;
  alerts: Alert[];
  /**
   * @deprecated
   */
  oldAlertsData: LegacyField[][];
  /**
   * @deprecated
   */
  ecsAlertsData: any[];
  alertsCount: number;
  browserFields: BrowserFields;

  isLoadingMutedAlerts: boolean;
  mutedAlerts?: MutedAlerts;

  isLoadingCases: boolean;
  cases?: Map<string, Case>;

  isLoadingMaintenanceWindows: boolean;
  maintenanceWindows?: Map<string, MaintenanceWindow>;

  showAlertStatusWithFlapping?: boolean;

  bulkActionsStore: [BulkActionsState, Dispatch<BulkActionsReducerAction>];
} & SetRequired<
  Pick<
    AlertsTableProps<AC>,
    | 'columns'
    | 'pageIndex'
    | 'onPageIndexChange'
    | 'pageSize'
    | 'onPageSizeChange'
    | 'renderCellValue'
    | 'renderCellPopover'
    | 'renderActionsCell'
    | 'expandedAlertIndex'
    | 'onExpandedAlertIndexChange'
    | 'renderExpandedAlertView'
    | 'services'
    | 'casesConfiguration'
    | 'openLinksInNewTab'
  >,
  | 'columns'
  | 'pageIndex'
  | 'onPageIndexChange'
  | 'pageSize'
  | 'onPageSizeChange'
  | 'openLinksInNewTab'
  | 'expandedAlertIndex'
  | 'onExpandedAlertIndexChange'
> &
  AC;

export type ComponentRenderer<AC extends AdditionalContext> = ComponentType<RenderContext<AC>>;

export interface CellActionsOptions {
  /**
   * Resolves the cell actions for a given column
   */
  getCellActionsForColumn: (columnId: string, columnIndex: number) => EuiDataGridColumnCellAction[];
  visibleCellActions?: number;
  disabledCellActions?: string[];
}

export interface PublicAlertsDataGridProps
  extends Omit<
    EuiDataGridProps,
    | 'renderCellPopover'
    | 'renderCellValue'
    | 'aria-labelledby'
    | 'columnVisibility'
    | 'rowCount'
    | 'sorting'
    | 'cellContext'
    | 'pagination'
    | 'columns'
  > {
  ruleTypeIds: string[];
  minScore?: number;
  trackScores?: boolean;
  consumers?: string[];
  /**
   * If true, shows a button in the table toolbar to inspect the search alerts request
   */
  showInspectButton?: boolean;
  /**
   * Cases-specific configuration options
   */
  casesConfiguration?: {
    featureId: string;
    owner: Parameters<CasesService['helpers']['canUseCases']>[0];
    appId?: string;
    syncAlerts?: boolean;
    extractObservables?: boolean;
  };
  /**
   * If true, hides the bulk actions controls
   */
  hideBulkActions?: boolean;
  /**
   * An array of bulk actions to be displayed in the table
   */
  additionalBulkActions?: BulkActionsPanelConfig[];
  /**
   * Width of the actions column
   */
  actionsColumnWidth?: number;
  /**
   * Options passed to the fields browser modal
   */
  fieldsBrowserOptions?: FieldBrowserOptions;
  /**
   * Options to customize the actions menu for each cell
   */
  cellActionsOptions?: CellActionsOptions;
}

export interface AlertsDataGridProps<AC extends AdditionalContext = AdditionalContext>
  extends PublicAlertsDataGridProps,
    Pick<EuiDataGridProps, 'columnVisibility'> {
  renderContext: RenderContext<AC>;
  additionalToolbarControls?: ReactNode;
  pageSizeOptions?: number[];
  leadingControlColumns?: EuiDataGridControlColumn[];
  trailingControlColumns?: EuiDataGridControlColumn[];
  'data-test-subj': string;
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  onColumnResize?: EuiDataGridOnColumnResizeHandler;
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  showInspectButton?: boolean;
  toolbarVisibility?: EuiDataGridToolBarVisibilityOptions;
  /**
   * Allows to consumers of the table to decide to highlight a row based on the current alert.
   */
  shouldHighlightRow?: (alert: Alert) => boolean;
  /**
   * Enable when rows may have variable heights (disables virtualization)
   */
  dynamicRowHeight?: boolean;
  sort: AlertsTableSortCombinations[];
  onSortChange: (sort: EuiDataGridSorting['columns']) => void;
  alertsQuerySnapshot?: EsQuerySnapshot;
}

export type AlertActionsProps<AC extends AdditionalContext = AdditionalContext> =
  RenderContext<AC> &
    EuiDataGridCellValueElementProps & {
      key?: Key;
      alert: Alert;
      onActionExecuted?: () => void;
      isAlertDetailsEnabled?: boolean;
      /**
       * Implement this to resolve your app's specific rule page path, return null to avoid showing the link
       */
      resolveRulePagePath?: (ruleId: string, currentPageId: string) => string | null;
      /**
       * Implement this to resolve your app's specific alert page path, return null to avoid showing the link
       */
      resolveAlertPagePath?: (alertId: string, currentPageId: string) => string | null;
    };

export interface BulkActionsConfig {
  label: string;
  key: string;
  'data-test-subj'?: string;
  disableOnQuery: boolean;
  disabledLabel?: string;
  onClick?: (
    selectedIds: TimelineItem[],
    isAllSelected: boolean,
    setIsBulkActionsLoading: (isLoading: boolean) => void,
    clearSelection: () => void,
    refresh: () => void
  ) => void;
  panel?: EuiContextMenuPanelId;
}

interface PanelConfig {
  id: EuiContextMenuPanelId;
  title?: JSX.Element | string;
  'data-test-subj'?: string;
}

export interface RenderContentPanelProps {
  alertItems: TimelineItem[];
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  isAllSelected?: boolean;
  clearSelection?: () => void;
  refresh?: () => void;
  closePopoverMenu: () => void;
}

export interface ContentPanelConfig extends PanelConfig {
  renderContent: (args: RenderContentPanelProps) => JSX.Element;
  items?: never;
}

export interface ItemsPanelConfig extends PanelConfig {
  content?: never;
  items: BulkActionsConfig[];
}

export type BulkActionsPanelConfig = ItemsPanelConfig | ContentPanelConfig;

export enum BulkActionsVerbs {
  add = 'add',
  delete = 'delete',
  clear = 'clear',
  selectCurrentPage = 'selectCurrentPage',
  selectAll = 'selectAll',
  rowCountUpdate = 'rowCountUpdate',
  updateRowLoadingState = 'updateRowLoadingState',
  updateAllLoadingState = 'updateAllLoadingState',
}

export interface BulkActionsReducerAction {
  action: BulkActionsVerbs;
  rowIndex?: number;
  rowCount?: number;
  isLoading?: boolean;
}

export interface BulkActionsState {
  rowSelection: Map<number, RowSelectionState>;
  isAllSelected: boolean;
  areAllVisibleRowsSelected: boolean;
  rowCount: number;
  updatedAt: number;
}

export interface AlertsTableFlyoutBaseProps {
  alert: Alert;
  isLoading: boolean;
  id?: string;
}

export type RowSelection = Map<number, RowSelectionState>;

export interface RowSelectionState {
  isLoading: boolean;
}

export enum AlertsField {
  name = 'kibana.alert.rule.name',
  reason = 'kibana.alert.reason',
  uuid = 'kibana.alert.rule.uuid',
  case_ids = 'kibana.alert.case_ids',
}

/*
 * Duplicated just for legacy reasons. Timelines plugin will be removed but
 * as long as the integration still work with Timelines we have to keep it
 */
export interface TimelineItem {
  _id: string;
  _index?: string | null;
  data: TimelineNonEcsData[];
  ecs: { _id: string; _index?: string };
}

export interface TimelineNonEcsData {
  field: string;
  value?: string[] | null;
}
