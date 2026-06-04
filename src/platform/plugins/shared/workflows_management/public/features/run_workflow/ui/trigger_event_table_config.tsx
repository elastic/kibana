/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCodeBlock,
  type EuiDataGridCellPopoverElementProps,
  euiFontSize,
  EuiIconTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  type CustomCellRenderer,
  type CustomGridColumnsConfiguration,
  type DataTableColumnsMeta,
  getRenderCustomToolbarWithElements,
  type SortOrder,
  type UnifiedDataTableRenderCustomToolbar,
  type UnifiedDataTableRenderCustomToolbarProps,
} from '@kbn/unified-data-table';
import { WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP } from '@kbn/workflows';
import type { TriggerEventLogGridRow } from './trigger_event_log_grid_cells';
import { TriggerEventLogSummaryCell, triggerSourceToGridRow } from './trigger_event_log_grid_cells';
import { formatTriggerEventPayloadPreview } from './trigger_event_payload_format';
import { isWorkflowsEventsTotalHitsCapped } from './trigger_event_search_totals';
import {
  createTriggerEventSummaryCopyPayloadCellAction,
  withoutTrailingDefaultCopyCellAction,
} from './trigger_event_summary_copy_payload_cell_action';
import type {
  UseTriggerEventTableConfigOptions,
  UseTriggerEventTableConfigResult,
} from './trigger_event_table_config_types';
import {
  TriggerEventRunPayloadSelectionSync,
  TriggerEventTableSelectionCountSync,
} from './workflow_execute_event_selection_sync';
import { WorkflowTriggerEventDataGridCellPopover } from './workflow_trigger_event_data_grid_cell_popover';

export type {
  UseTriggerEventTableConfigOptions,
  UseTriggerEventTableConfigResult,
} from './trigger_event_table_config_types';

const EM_DASH = '—';

export const DEFAULT_TRIGGER_EVENT_TABLE_COLUMNS: string[] = ['@timestamp', 'summary'];

export const VISIBLE_COLUMNS_FALLBACK: readonly string[] = [...DEFAULT_TRIGGER_EVENT_TABLE_COLUMNS];

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

export function useTriggerEventTableConfig(
  options: UseTriggerEventTableConfigOptions
): UseTriggerEventTableConfigResult {
  const {
    services,
    dataView,
    rows,
    documentCount,
    replaySpaceId,
    setValue,
    setErrors,
    onTriggerEventTableSelectionCountChange,
  } = options;

  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const [visibleTableColumns, setVisibleTableColumns] = useState<string[]>(() => [
    ...DEFAULT_TRIGGER_EVENT_TABLE_COLUMNS,
  ]);
  const [showTimeColumn, setShowTimeColumn] = useState(true);
  const [sort, setSort] = useState<SortOrder[]>([['@timestamp', 'desc']]);

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
          const jsonValue = formatTriggerEventPayloadPreview(source.payload);
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

  const leftToolbarContent = useMemo(() => {
    const isTotalHitsCapped = isWorkflowsEventsTotalHitsCapped(documentCount);

    return (
      <EuiText size="s" color="subdued" data-test-subj="workflowTriggerEventsDocumentCount">
        <span
          css={{ fontWeight: euiTheme.font.weight.bold }}
          data-test-subj="workflowTriggerEventsDocumentCountValue"
        >
          {isTotalHitsCapped ? (
            <FormattedMessage
              id="workflows.workflowExecuteEventTriggerForm.cappedDocumentCount"
              defaultMessage="{count}+"
              values={{
                count: <FormattedNumber value={WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP} />,
              }}
            />
          ) : (
            <FormattedNumber value={documentCount} />
          )}
        </span>{' '}
        {isTotalHitsCapped ? (
          <>
            {i18n.translate('workflows.workflowExecuteEventTriggerForm.cappedDocumentCountLabel', {
              defaultMessage: 'documents',
            })}
            <EuiIconTip
              type="iInCircle"
              css={{ marginLeft: euiTheme.size.xs }}
              content={i18n.translate(
                'workflows.workflowExecuteEventTriggerForm.cappedDocumentCountTooltip',
                {
                  defaultMessage:
                    'Total matching events may exceed {cap}. Narrow your search or time range to see a precise count.',
                  values: {
                    cap: WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP.toLocaleString(),
                  },
                }
              )}
            />
          </>
        ) : (
          i18n.translate('workflows.workflowExecuteEventTriggerForm.documentCountLabel', {
            defaultMessage: '{count, plural, one {document} other {documents}}',
            values: { count: documentCount },
          })
        )}
      </EuiText>
    );
  }, [documentCount, euiTheme.font.weight.bold, euiTheme.size.xs]);

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

  return {
    visibleTableColumns,
    showTimeColumn,
    sort,
    dataTableRows,
    columnsMeta,
    externalCustomRenderers,
    customGridColumnsConfiguration,
    unifiedDataTableServices,
    getNoCellActions,
    handleSortChange,
    handleUnifiedDataTableSetColumns,
    timestampCellTypography,
    renderCustomToolbar,
    renderCellPopover,
  };
}
