/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { DataGridDensity } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataViewFieldBase, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n-react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  type CustomCellRenderer,
  type CustomGridColumnsConfiguration,
  DataLoadingState,
  type DataTableColumnsMeta,
  getRenderCustomToolbarWithElements,
  SELECT_ROW,
  type SortOrder,
  UnifiedDataTable,
  type UnifiedDataTableRenderCustomToolbar,
  type UnifiedDataTableRenderCustomToolbarProps,
} from '@kbn/unified-data-table';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import {
  WORKFLOWS_EVENTS_DATA_STREAM,
  WORKFLOWS_EVENTS_DATA_VIEW_FIELDS,
  type WorkflowYaml,
} from '@kbn/workflows';
import { useQueryTriggerEvents } from '@kbn/workflows-ui';
import { TIMEPICKER_FALLBACK } from './constants';
import type { TriggerEventLogGridRow } from './trigger_event_log_grid_cells';
import { TriggerEventLogSummaryCell, triggerSourceToGridRow } from './trigger_event_log_grid_cells';
import {
  createTriggerEventSummaryCopyPayloadCellAction,
  formatTriggerEventPayloadAsText,
  withoutTrailingDefaultCopyCellAction,
} from './trigger_event_summary_copy_payload_cell_action';
import {
  useAccumulatedTriggerEventSearchPages,
  useTriggerEventGridScrollLoadMore,
} from './workflow_execute_event_form_infinite_list';
import {
  doesSubmittedKqlReferenceTriggerIdField,
  getWorkflowCustomTriggerTypeIds,
} from './workflow_execute_modal_helpers';
import { WorkflowTriggerEventDataGridCellPopover } from './workflow_trigger_event_data_grid_cell_popover';
import { useKibana } from '../../../hooks/use_kibana';
import { useSpaceId } from '../../../hooks/use_space_id';
import { useEventDrivenExecutionStatus } from '../../workflow_list/ui/use_event_driven_execution_status';

function resolveTriggerEventTableLoadingState(
  isSearchLoading: boolean,
  accumulatedHitsLength: number,
  isEventConfigLoading: boolean,
  isFetching: boolean
): DataLoadingState {
  const isInitialSearchLoading =
    (isSearchLoading && accumulatedHitsLength === 0) || isEventConfigLoading;
  if (isInitialSearchLoading) {
    return DataLoadingState.loading;
  }
  if (isFetching && accumulatedHitsLength > 0) {
    return DataLoadingState.loadingMore;
  }
  return DataLoadingState.loaded;
}

const PAGE_SIZE = 50;

const EM_DASH = '—';

const DEFAULT_TRIGGER_EVENT_TABLE_COLUMNS: string[] = ['@timestamp', 'summary'];

const VISIBLE_COLUMNS_FALLBACK: readonly string[] = [...DEFAULT_TRIGGER_EVENT_TABLE_COLUMNS];

function workflowsEventsKqlFieldToFieldSpec(field: DataViewFieldBase): FieldSpec {
  const isObject = field.type === 'object';
  return {
    ...field,
    searchable: true,
    aggregatable: !isObject,
    readFromDocValues: !isObject,
    isMapped: true,
  };
}

const WORKFLOWS_EVENTS_KQL_FALLBACK_FIELDS: FieldSpec[] = WORKFLOWS_EVENTS_DATA_VIEW_FIELDS.map(
  workflowsEventsKqlFieldToFieldSpec
);

export function buildTriggerEventReplayInputs(
  source: Record<string, unknown>,
  currentSpaceId: string
): Record<string, unknown> {
  const rawPayload = source.payload;
  const payload =
    rawPayload !== null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? { ...(rawPayload as Record<string, unknown>) }
      : {};

  return {
    event: {
      ...payload,
      timestamp: new Date().toISOString(),
      spaceId: currentSpaceId,
      eventChainDepth: 0,
      eventChainVisitedWorkflowIds: [] as string[],
    },
  };
}

function buildSummaryText(row: TriggerEventLogGridRow): string {
  const parts: string[] = [];
  if (row.triggerId !== EM_DASH) {
    parts.push(row.triggerId);
  }
  if (row.subscriptionIds.length > 0) {
    parts.push(...row.subscriptionIds);
  }
  if (row.payloadSummaryText) {
    parts.push(row.payloadSummaryText);
  }
  return parts.join(' ');
}

function applyWorkflowsEventsKqlFallbackFields(dataView: DataView): void {
  if (dataView.getFieldByName('triggerId')) {
    return;
  }
  dataView.fields.replaceAll(WORKFLOWS_EVENTS_KQL_FALLBACK_FIELDS);
}

export interface WorkflowExecuteEventFormProps {
  definition: WorkflowYaml | null;
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  /** Clears validation errors when the table updates the run payload from the current selection. */
  setErrors?: (errors: string | null) => void;
  /** Number of rows currently selected in the trigger-events table (checkbox selection). */
  onTriggerEventTableSelectionCountChange?: (selectedCount: number) => void;
}

interface TriggerEventTableRow {
  id: string;
  grid: TriggerEventLogGridRow;
  source: Record<string, unknown>;
}

function isHttpForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const withResponse = error as { response?: { status?: number } };
  if (withResponse.response?.status === 403) {
    return true;
  }
  const withStatus = error as { statusCode?: number };
  return withStatus.statusCode === 403;
}

function formatQueryError(error: unknown): string {
  if (isHttpForbiddenError(error)) {
    return i18n.translate('workflows.workflowExecuteEventTriggerForm.forbiddenErrorBody', {
      defaultMessage:
        'You need the Workflows "Read Workflow Execution" privilege to search trigger events.',
    });
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return i18n.translate('workflows.workflowExecuteEventTriggerForm.unknownError', {
    defaultMessage: 'Request failed',
  });
}

interface TriggerEventRunPayloadSelectionSyncProps {
  dataTableRows: DataTableRecord[];
  replaySpaceId: string;
  setValue: (value: string) => void;
  setErrors?: (errors: string | null) => void;
}

/**
 * Renders inside UnifiedDataTable's toolbar (under UnifiedDataTableContext.Provider) so we can
 * mirror checkbox selection into the modal JSON without adding APIs to @kbn/unified-data-table.
 */
const TriggerEventRunPayloadSelectionSync = ({
  dataTableRows,
  replaySpaceId,
  setValue,
  setErrors,
}: TriggerEventRunPayloadSelectionSyncProps) => {
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const selectedStateRef = useRef(selectedDocsState);
  selectedStateRef.current = selectedDocsState;

  const docIdsKey = (selectedDocsState?.docIdsInSelectionOrder ?? []).join('\0');

  useEffect(() => {
    const docIds = selectedStateRef.current?.docIdsInSelectionOrder ?? [];
    if (docIds.length === 0) {
      setValue('');
      setErrors?.(null);
      return;
    }
    const primaryId = docIds[0];
    const record = dataTableRows.find((r) => r.id === primaryId);
    if (!record) {
      setValue('');
      return;
    }
    const source = (record.raw._source ?? {}) as Record<string, unknown>;
    setValue(JSON.stringify(buildTriggerEventReplayInputs(source, replaySpaceId), null, 2));
    setErrors?.(null);
  }, [dataTableRows, docIdsKey, replaySpaceId, setErrors, setValue]);

  return null;
};

TriggerEventRunPayloadSelectionSync.displayName = 'TriggerEventRunPayloadSelectionSync';

interface TriggerEventTableSelectionCountSyncProps {
  onSelectionCountChange: (selectedCount: number) => void;
}

/**
 * Reports checkbox selection size to the parent so the run modal can block execution when
 * multiple rows are selected (only a single trigger event is supported).
 */
const TriggerEventTableSelectionCountSync = ({
  onSelectionCountChange,
}: TriggerEventTableSelectionCountSyncProps) => {
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const selectedStateRef = useRef(selectedDocsState);
  selectedStateRef.current = selectedDocsState;

  const docIdsKey = (selectedDocsState?.docIdsInSelectionOrder ?? []).join('\0');

  useEffect(() => {
    const docIds = selectedStateRef.current?.docIdsInSelectionOrder ?? [];
    onSelectionCountChange(docIds.length);
  }, [docIdsKey, onSelectionCountChange]);

  return null;
};

TriggerEventTableSelectionCountSync.displayName = 'TriggerEventTableSelectionCountSync';

interface WorkflowExecuteEventFormSearchResultsProps {
  isError: boolean;
  searchError: unknown;
  errors: string | null;
  triggerEventsSurfaceRef: React.Ref<HTMLDivElement>;
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
  tableSurfaceColor: string;
  timestampCellTypography: ReturnType<typeof euiFontSize>;
  tableLoadingState: DataLoadingState;
  dataView: DataView | null;
  getNoCellActions: UiActionsStart['getTriggerCompatibleActions'];
  visibleTableColumns: string[];
  columnsMeta: DataTableColumnsMeta;
  dataTableRows: DataTableRecord[];
  rowsLength: number;
  unifiedDataTableServices: React.ComponentProps<typeof UnifiedDataTable>['services'];
  handleUnifiedDataTableSetColumns: (columns: string[], hideTimeColumn: boolean) => void;
  showTimeColumn: boolean;
  sort: SortOrder[];
  handleSortChange: (nextSort: string[][]) => void;
  customGridColumnsConfiguration: CustomGridColumnsConfiguration;
  renderCustomToolbar: UnifiedDataTableRenderCustomToolbar;
  renderCellPopover: (popoverProps: EuiDataGridCellPopoverElementProps) => React.JSX.Element;
  externalCustomRenderers: CustomCellRenderer;
  hasMoreHits: boolean;
  isFetching: boolean;
  accumulatedHitsLength: number;
}

const WorkflowExecuteEventFormSearchResults = memo(function WorkflowExecuteEventFormSearchResults({
  isError,
  searchError,
  errors,
  triggerEventsSurfaceRef,
  euiTheme,
  tableSurfaceColor,
  timestampCellTypography,
  tableLoadingState,
  dataView,
  getNoCellActions,
  visibleTableColumns,
  columnsMeta,
  dataTableRows,
  rowsLength,
  unifiedDataTableServices,
  handleUnifiedDataTableSetColumns,
  showTimeColumn,
  sort,
  handleSortChange,
  customGridColumnsConfiguration,
  renderCustomToolbar,
  renderCellPopover,
  externalCustomRenderers,
  hasMoreHits,
  isFetching,
  accumulatedHitsLength,
}: WorkflowExecuteEventFormSearchResultsProps): React.JSX.Element {
  return (
    <>
      {isError && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.workflowExecuteEventTriggerForm.errorTitle', {
              defaultMessage: 'Could not load trigger events',
            })}
            color="danger"
            iconType="error"
            size="s"
          >
            <p>{formatQueryError(searchError)}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {errors !== null && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'workflows.workflowExecuteEventTriggerForm.executionPayloadErrorTitle',
              {
                defaultMessage: 'Fix the run payload before continuing',
              }
            )}
            color="danger"
            iconType="error"
            size="s"
          >
            <p>{errors}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      <EuiFlexItem
        grow={true}
        css={css({
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        })}
      >
        <div
          ref={triggerEventsSurfaceRef}
          css={[
            css({
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              width: '100%',
              minWidth: 0,
              border: euiTheme.border.thin,
              borderRadius: euiTheme.border.radius.medium,
              boxSizing: 'border-box',
              backgroundColor: tableSurfaceColor,
            }),
            css`
              padding-block-start: ${euiTheme.size.m};
              padding-inline: ${euiTheme.size.s};
              padding-block-end: ${euiTheme.size.xs};
              .unifiedDataTable__headerCell .euiDataGridHeaderCell__button {
                margin-top: 0 !important;
              }
              .euiDataGridHeaderCell .euiDataGridHeaderCell__button,
              .euiDataGridHeaderCell .euiDataGridHeaderCell__content {
                font-size: ${timestampCellTypography.fontSize} !important;
                line-height: ${timestampCellTypography.lineHeight};
              }
              .euiDataGridHeader,
              .euiDataGridHeaderCell {
                background-color: ${tableSurfaceColor} !important;
              }
              .euiDataGridRowCell[data-gridcell-column-id='@timestamp']
                .euiDataGridRowCell__content,
              .euiDataGridRowCell[data-gridcell-column-id='@timestamp']
                .unifiedDataTable__cellValue {
                white-space: nowrap;
                font-size: ${timestampCellTypography.fontSize} !important;
                line-height: ${timestampCellTypography.lineHeight};
              }
              .unifiedDataTable__inner {
                flex: 1;
                minheight: 0;
                height: 100%;
              }
              .unifiedDataTableToolbar {
                padding-top: ${euiTheme.size.xs};
                padding-bottom: ${euiTheme.size.xs};
              }
              .unifiedDataTableToolbarControlButton:has(
                  [data-test-subj='unifiedDataTableSelectionBtn']
                ),
              .unifiedDataTableToolbarControlButton:has([data-test-subj='dscGridSelectAllDocs']) {
                display: none !important;
              }
              .euiDataGrid__pagination {
                padding-bottom: 0 !important;
                margin-bottom: 0 !important;
              }
            `,
          ]}
          data-test-subj="workflowTriggerEventsTable"
        >
          {tableLoadingState === DataLoadingState.loading && (
            <div
              css={css({
                position: 'absolute',
                insetInlineStart: 0,
                insetInlineEnd: 0,
                top: 0,
                zIndex: euiTheme.levels.toast,
              })}
            >
              <EuiProgress size="xs" color="accent" />
            </div>
          )}
          {dataView ? (
            <>
              <div
                css={css({
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                })}
              >
                <CellActionsProvider getTriggerCompatibleActions={getNoCellActions}>
                  <UnifiedDataTable
                    ariaLabelledBy="workflowTriggerEventsTable"
                    columns={visibleTableColumns}
                    columnsMeta={columnsMeta}
                    rows={dataTableRows}
                    dataView={dataView}
                    loadingState={tableLoadingState}
                    sampleSizeState={rowsLength}
                    services={unifiedDataTableServices}
                    onSetColumns={handleUnifiedDataTableSetColumns}
                    showTimeCol={showTimeColumn}
                    sort={sort}
                    onSort={handleSortChange}
                    isSortEnabled={true}
                    isPaginationEnabled={false}
                    dataGridDensityState={DataGridDensity.NORMAL}
                    isPlainRecord={true}
                    showFullScreenButton={true}
                    showKeyboardShortcuts={false}
                    enableInTableSearch={true}
                    controlColumnIds={[SELECT_ROW]}
                    customGridColumnsConfiguration={customGridColumnsConfiguration}
                    renderCustomToolbar={renderCustomToolbar}
                    renderCellPopover={renderCellPopover}
                    externalCustomRenderers={externalCustomRenderers}
                  />
                </CellActionsProvider>
              </div>
              {hasMoreHits && isFetching && accumulatedHitsLength > 0 ? (
                <div
                  role="status"
                  aria-label={i18n.translate(
                    'workflows.workflowExecuteEventTriggerForm.loadingMoreTriggerEventsAria',
                    {
                      defaultMessage: 'Loading more trigger events',
                    }
                  )}
                  data-test-subj="workflowTriggerEventsLoadingMore"
                  css={css({
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingBlock: euiTheme.size.s,
                  })}
                >
                  <EuiLoadingSpinner size="m" />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </EuiFlexItem>
    </>
  );
});

WorkflowExecuteEventFormSearchResults.displayName = 'WorkflowExecuteEventFormSearchResults';

export const WorkflowExecuteEventForm = ({
  definition,
  value: _value,
  setValue,
  errors,
  setErrors,
  onTriggerEventTableSelectionCountChange,
}: WorkflowExecuteEventFormProps): React.JSX.Element => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const tableSurfaceColor = euiTheme.colors.backgroundBasePlain;
  const { services } = useKibana();
  const { SearchBar } = services.unifiedSearch.ui;
  const { notifications } = services;

  const { eventDrivenExecutionEnabled, isLoading: isEventConfigLoading } =
    useEventDrivenExecutionStatus();

  const activeSpaceId = useSpaceId();
  const replaySpaceId = activeSpaceId ?? 'default';

  const customTriggerTypeIds = useMemo(
    () => getWorkflowCustomTriggerTypeIds(definition),
    [definition]
  );
  const customTriggerIdsKey = useMemo(
    () => customTriggerTypeIds.join('\0'),
    [customTriggerTypeIds]
  );

  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [submittedQuery, setSubmittedQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [timeRange, setTimeRange] = useState<TimeRange>(
    () => services.data?.query?.timefilter?.timefilter?.getTimeDefaults?.() ?? TIMEPICKER_FALLBACK
  );
  const [dataView, setDataView] = useState<DataView | null>(null);
  const dataViewCreatingRef = useRef(false);
  const [pageIndex, setPageIndex] = useState(0);
  const triggerEventsSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState<string[]>(() => [
    ...DEFAULT_TRIGGER_EVENT_TABLE_COLUMNS,
  ]);
  const [showTimeColumn, setShowTimeColumn] = useState(true);
  const [sort, setSort] = useState<SortOrder[]>([['@timestamp', 'desc']]);

  useEffect(() => {
    setQuery({ query: '', language: 'kuery' });
    setSubmittedQuery({ query: '', language: 'kuery' });
  }, [customTriggerIdsKey]);

  useEffect(() => {
    const dataViews = services.dataViews;
    if (!dataViews || dataViewCreatingRef.current) {
      return;
    }
    dataViewCreatingRef.current = true;

    const create = async () => {
      try {
        const created = await dataViews.create({
          title: WORKFLOWS_EVENTS_DATA_STREAM,
          timeFieldName: '@timestamp',
          allowHidden: true,
        });
        try {
          await dataViews.refreshFields(created, false, true);
        } catch {
          notifications.toasts.addWarning({
            title: i18n.translate(
              'workflows.workflowExecuteEventTriggerForm.refreshFieldsWarningTitle',
              {
                defaultMessage: 'Limited field suggestions',
              }
            ),
            text: i18n.translate(
              'workflows.workflowExecuteEventTriggerForm.refreshFieldsWarningBody',
              {
                defaultMessage:
                  'Could not refresh fields for .workflows-events. Type field names manually (e.g. triggerId, eventId, payload.*).',
              }
            ),
          });
        }
        applyWorkflowsEventsKqlFallbackFields(created);
        setDataView(created);
      } catch (error) {
        setDataView(null);
        notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: i18n.translate(
            'workflows.workflowExecuteEventTriggerForm.dataViewCreateErrorTitle',
            {
              defaultMessage: 'Could not prepare trigger event search',
            }
          ),
          toastMessage: i18n.translate(
            'workflows.workflowExecuteEventTriggerForm.dataViewCreateErrorBody',
            {
              defaultMessage:
                'Creating a data view for .workflows-events failed. Check data view privileges or try again.',
            }
          ),
        });
      } finally {
        dataViewCreatingRef.current = false;
      }
    };

    create();
  }, [services.dataViews, notifications.toasts]);

  const queryEnabled =
    eventDrivenExecutionEnabled && !isEventConfigLoading && Boolean(services.http);

  const searchParams = useMemo(() => {
    const kqlTrimmed = submittedQuery.query.trim();
    const kqlForRequest = kqlTrimmed || undefined;
    const kqlAlreadyScopesTriggerId =
      kqlTrimmed.length > 0 && doesSubmittedKqlReferenceTriggerIdField(kqlTrimmed);
    return {
      ...(kqlAlreadyScopesTriggerId || customTriggerTypeIds.length === 0
        ? {}
        : { triggerIds: customTriggerTypeIds }),
      ...(kqlForRequest !== undefined ? { kql: kqlForRequest } : {}),
      from: timeRange.from,
      to: timeRange.to,
      page: pageIndex + 1,
      size: PAGE_SIZE,
    };
  }, [customTriggerTypeIds, submittedQuery.query, timeRange.from, timeRange.to, pageIndex]);

  const {
    data: searchResult,
    isLoading: isSearchLoading,
    isFetching,
    isPreviousData,
    isError,
    error: searchError,
  } = useQueryTriggerEvents(searchParams, { enabled: queryEnabled });

  const [accumulatedHits, setAccumulatedHits] = useAccumulatedTriggerEventSearchPages(
    searchResult,
    pageIndex,
    isPreviousData
  );

  useLayoutEffect(() => {
    setPageIndex(0);
    setAccumulatedHits([]);
    /**
     * Must run in useLayoutEffect (not useEffect) so it executes before the passive effect in
     * useAccumulatedTriggerEventSearchPages. Otherwise, when the next query is served from cache
     * (isPreviousData false on the first paint), the accumulator applies hits and this reset
     * would clear them afterward with no dependency change, leaving the grid empty.
     */
  }, [definition, submittedQuery.query, timeRange.from, timeRange.to, setAccumulatedHits]);

  const handleLoadMoreTriggerEventPage = useCallback(() => {
    setPageIndex((p) => p + 1);
  }, []);

  const rows: TriggerEventTableRow[] = useMemo(() => {
    if (!accumulatedHits.length) {
      return [];
    }
    return accumulatedHits.map((hit) => {
      const source = hit.source as Record<string, unknown>;
      return {
        id: hit.id,
        source,
        grid: triggerSourceToGridRow(hit.id, source),
      };
    });
  }, [accumulatedHits]);

  const hasMoreHits = Boolean(searchResult && accumulatedHits.length < searchResult.total);

  useTriggerEventGridScrollLoadMore({
    dataViewReady: Boolean(dataView),
    queryEnabled,
    surfaceRef: triggerEventsSurfaceRef,
    isFetching,
    hasMoreHits,
    reboundKey: `${accumulatedHits.length}-${searchResult?.total ?? 0}`,
    onNearBottom: handleLoadMoreTriggerEventPage,
  });

  const tableLoadingState = resolveTriggerEventTableLoadingState(
    isSearchLoading,
    accumulatedHits.length,
    isEventConfigLoading,
    isFetching
  );

  const handleQueryChange = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (newQuery) {
        setQuery(newQuery);
      }
      setTimeRange(dateRange);
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (newQuery) {
        setQuery(newQuery);
        setSubmittedQuery(newQuery);
      }
      setTimeRange(dateRange);
      setPageIndex(0);
      setAccumulatedHits([]);
    },
    [setAccumulatedHits]
  );

  const dataTableRows = useMemo<DataTableRecord[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        raw: {
          _id: row.id,
          _source: row.source,
        },
        flattened: {
          '@timestamp': row.source['@timestamp'],
          summary: buildSummaryText(row.grid),
          eventId: row.grid.eventId === EM_DASH ? '' : row.grid.eventId,
          triggerId: row.grid.triggerId === EM_DASH ? '' : row.grid.triggerId,
          spaceId: String(row.source.spaceId ?? ''),
          subscriptions: row.grid.subscriptionIds.join(', '),
          payload: row.grid.payloadSummaryText,
        },
      })),
    [rows]
  );
  const columnsMeta: DataTableColumnsMeta = useMemo(
    () => ({
      summary: { type: 'string' },
      eventId: { type: 'string' },
      triggerId: { type: 'string' },
      spaceId: { type: 'string' },
      subscriptions: { type: 'string' },
      payload: { type: 'string' },
    }),
    []
  );
  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      summary: ({ row, isDetails }) => {
        const source = (row.raw._source ?? {}) as Record<string, unknown>;
        if (isDetails) {
          const jsonValue = formatTriggerEventPayloadAsText(source.payload);
          return (
            <div
              data-test-subj="workflowTriggerEventSummaryCellExpanded"
              css={css({
                minWidth: 0,
                width: 'min(75vw, 640px)',
              })}
            >
              <EuiCodeBlock
                language="json"
                fontSize="s"
                paddingSize="m"
                isCopyable
                css={css({ maxHeight: 420, overflow: 'auto' })}
              >
                {jsonValue}
              </EuiCodeBlock>
            </div>
          );
        }
        return <TriggerEventLogSummaryCell row={triggerSourceToGridRow(row.id, source)} />;
      },
    }),
    []
  );
  const summaryCopyPayloadCellAction = useMemo(
    () => createTriggerEventSummaryCopyPayloadCellAction(services.notifications.toasts),
    [services.notifications.toasts]
  );
  const customGridColumnsConfiguration = useMemo<CustomGridColumnsConfiguration>(
    () => ({
      '@timestamp': ({ column }) => ({
        ...column,
        initialWidth: 240,
      }),
      summary: ({ column }) => {
        const defaultCellActions = column.cellActions ?? [];
        const cellActionsWithoutDefaultCopy =
          withoutTrailingDefaultCopyCellAction(defaultCellActions);
        return {
          ...column,
          display: (
            <span
              css={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: euiTheme.size.xs,
              })}
            >
              {i18n.translate('workflows.workflowExecuteEventTriggerForm.summaryColumnHeader', {
                defaultMessage: 'Summary',
              })}
              <EuiIconTip
                type="question"
                title={i18n.translate(
                  'workflows.workflowExecuteEventTriggerForm.summaryColumnHeader',
                  {
                    defaultMessage: 'Summary',
                  }
                )}
                content={i18n.translate(
                  'workflows.workflowExecuteEventTriggerForm.summaryColumnHeaderTooltip',
                  {
                    defaultMessage:
                      'Shows trigger identifiers first (trigger ID and workflows that matched when the event was emitted), followed by payload content.',
                  }
                )}
              />
            </span>
          ),
          cellActions: [...cellActionsWithoutDefaultCopy, summaryCopyPayloadCellAction],
        };
      },
    }),
    [euiTheme.size.xs, summaryCopyPayloadCellAction]
  );
  const unifiedDataTableServices = useMemo(
    () => ({
      theme: services.theme,
      fieldFormats: services.fieldFormats,
      uiSettings: services.uiSettings,
      toastNotifications: services.notifications.toasts,
      storage: services.storage,
      data: {
        ...services.data,
        dataViews: services.dataViews,
      },
    }),
    [
      services.data,
      services.dataViews,
      services.fieldFormats,
      services.notifications.toasts,
      services.storage,
      services.theme,
      services.uiSettings,
    ]
  );
  const getNoCellActions = useCallback<UiActionsStart['getTriggerCompatibleActions']>(
    async () => [],
    []
  );
  const handleSortChange = useCallback((nextSort: string[][]) => {
    setSort(
      nextSort
        .filter(
          (value): value is [string, 'asc' | 'desc'] =>
            Array.isArray(value) &&
            value.length === 2 &&
            typeof value[0] === 'string' &&
            (value[1] === 'asc' || value[1] === 'desc')
        )
        .map(([field, direction]) => [field, direction])
    );
  }, []);

  const handleUnifiedDataTableSetColumns = useCallback(
    (columns: string[], hideTimeColumn: boolean) => {
      let nextColumns = columns.length > 0 ? [...columns] : [...VISIBLE_COLUMNS_FALLBACK];
      const timeFieldName = dataView?.timeFieldName;
      if (timeFieldName && nextColumns.length === 1 && nextColumns[0] === timeFieldName) {
        nextColumns = [...nextColumns, 'summary'];
      }
      setVisibleTableColumns(nextColumns);
      setShowTimeColumn(!hideTimeColumn);
    },
    [dataView]
  );

  const timestampCellTypography = useMemo(
    () => euiFontSize(euiThemeContext, 'xs'),
    [euiThemeContext]
  );

  const documentCount = searchResult?.total ?? 0;
  const leftToolbarContent = useMemo(
    () => (
      <EuiText size="s" color="subdued" data-test-subj="workflowTriggerEventsDocumentCount">
        <span css={{ fontWeight: euiTheme.font.weight.bold }}>
          <FormattedNumber value={documentCount} />
        </span>{' '}
        {i18n.translate('workflows.workflowExecuteEventTriggerForm.documentCountLabel', {
          defaultMessage: '{count, plural, one {document} other {documents}}',
          values: { count: documentCount },
        })}
      </EuiText>
    ),
    [documentCount, euiTheme.font.weight.bold]
  );
  const baseToolbarRenderer = useMemo(
    () =>
      getRenderCustomToolbarWithElements({
        leftSide: leftToolbarContent,
      }),
    [leftToolbarContent]
  );
  const renderCustomToolbar = useMemo((): UnifiedDataTableRenderCustomToolbar => {
    function renderTriggerEventToolbar(toolbarProps: UnifiedDataTableRenderCustomToolbarProps) {
      return (
        <>
          <TriggerEventRunPayloadSelectionSync
            dataTableRows={dataTableRows}
            replaySpaceId={replaySpaceId}
            setValue={setValue}
            setErrors={setErrors}
          />
          {onTriggerEventTableSelectionCountChange ? (
            <TriggerEventTableSelectionCountSync
              onSelectionCountChange={onTriggerEventTableSelectionCountChange}
            />
          ) : null}
          {baseToolbarRenderer(toolbarProps)}
        </>
      );
    }
    renderTriggerEventToolbar.displayName = 'WorkflowTriggerEventsRenderCustomToolbar';
    return renderTriggerEventToolbar;
  }, [
    baseToolbarRenderer,
    dataTableRows,
    onTriggerEventTableSelectionCountChange,
    replaySpaceId,
    setErrors,
    setValue,
  ]);

  const renderCellPopover = useCallback((popoverProps: EuiDataGridCellPopoverElementProps) => {
    return <WorkflowTriggerEventDataGridCellPopover {...popoverProps} />;
  }, []);

  if (!eventDrivenExecutionEnabled && !isEventConfigLoading) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate(
          'workflows.workflowExecuteEventTriggerForm.eventDrivenDisabledTitle',
          {
            defaultMessage: 'Event-driven execution is disabled',
          }
        )}
        color="warning"
        iconType="alert"
        size="s"
      >
        <EuiText size="s">
          {i18n.translate('workflows.workflowExecuteEventTriggerForm.eventDrivenDisabledBody', {
            defaultMessage:
              'Trigger-event logging and replay require event-driven workflows to be enabled in cluster configuration.',
          })}
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup
      className="workflowTriggerEventsRoot"
      direction="column"
      gutterSize="s"
      css={css({
        flex: 1,
        minHeight: 0,
        height: '100%',
      })}
    >
      <EuiFlexItem grow={false}>
        <SearchBar
          appName="workflow_management"
          useDefaultBehaviors={true}
          onQueryChange={handleQueryChange}
          onQuerySubmit={handleQuerySubmit}
          query={query}
          indexPatterns={dataView ? [dataView] : []}
          showDatePicker={true}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          showFilterBar={false}
          showSubmitButton={true}
          placeholder={i18n.translate(
            'workflows.workflowExecuteEventTriggerForm.searchPlaceholder',
            {
              defaultMessage: 'Filter using KQL (e.g. triggerId: my.trigger or eventId: abc)',
            }
          )}
          data-test-subj="workflow-trigger-events-query-input"
          displayStyle="inPage"
        />
      </EuiFlexItem>

      <WorkflowExecuteEventFormSearchResults
        isError={isError}
        searchError={searchError}
        errors={errors}
        triggerEventsSurfaceRef={triggerEventsSurfaceRef}
        euiTheme={euiTheme}
        tableSurfaceColor={tableSurfaceColor}
        timestampCellTypography={timestampCellTypography}
        tableLoadingState={tableLoadingState}
        dataView={dataView}
        getNoCellActions={getNoCellActions}
        visibleTableColumns={visibleTableColumns}
        columnsMeta={columnsMeta}
        dataTableRows={dataTableRows}
        rowsLength={rows.length}
        unifiedDataTableServices={unifiedDataTableServices}
        handleUnifiedDataTableSetColumns={handleUnifiedDataTableSetColumns}
        showTimeColumn={showTimeColumn}
        sort={sort}
        handleSortChange={handleSortChange}
        customGridColumnsConfiguration={customGridColumnsConfiguration}
        renderCustomToolbar={renderCustomToolbar}
        renderCellPopover={renderCellPopover}
        externalCustomRenderers={externalCustomRenderers}
        hasMoreHits={hasMoreHits}
        isFetching={isFetching}
        accumulatedHitsLength={accumulatedHits.length}
      />
    </EuiFlexGroup>
  );
};

WorkflowExecuteEventForm.displayName = 'WorkflowExecuteEventForm';
