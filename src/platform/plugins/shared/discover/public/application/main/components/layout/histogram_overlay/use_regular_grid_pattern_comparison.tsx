/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  getCountSparkline,
  getESQLStatsQueryMeta,
  type CountSparkline,
  type ESQLStatsQueryMeta,
} from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord, RowControlColumn } from '@kbn/discover-utils';
import { isEqual } from 'lodash';
import { FetchStatus } from '../../../../types';
import {
  publishHistogramOverlaySelection,
  useCurrentTabRuntimeState,
  useInternalStateSelector,
  useRuntimeStateManager,
  type DiscoverAppState,
  type DiscoverHistogramOverlaySelection,
} from '../../../state_management/redux';
import {
  buildHistogramOverlaySeries,
  getSingleCategorizeGroupField,
  readSparklineValues,
  resolveHistogramOverlayPublication,
} from './histogram_overlay_series';
import {
  getPatternComparisonMessageState,
  PatternComparisonMessage,
} from './pattern_comparison_message';

export const COMPARE_PATTERN_CONTROL_ID = 'comparePatternHistogram';

const comparePatternLabel = i18n.translate('discover.histogramOverlay.comparePatternAriaLabel', {
  defaultMessage: 'Compare pattern',
});

const stopComparingPatternLabel = i18n.translate(
  'discover.histogramOverlay.stopComparingPatternAriaLabel',
  { defaultMessage: 'Stop comparing pattern' }
);

const selectPatternTooltip = i18n.translate(
  'discover.histogramOverlay.patternComparisonHintDescription',
  {
    defaultMessage: 'Select a pattern to compare its volume with total document volume.',
  }
);

const unavailableStopTooltip = i18n.translate(
  'discover.histogramOverlay.patternComparisonUnavailableStopTooltip',
  {
    defaultMessage: 'Pattern comparison is unavailable. Stop comparing pattern.',
  }
);

const approximateStopTooltip = i18n.translate(
  'discover.histogramOverlay.patternComparisonApproximateStopTooltip',
  {
    defaultMessage: 'Pattern comparison is approximate. Stop comparing pattern.',
  }
);

const formatPatternLabel = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
};

/** Stable across a refresh, and distinct when rows share a pattern but differ on another group. */
export const getGridHistogramOverlayRowId = (
  record: DataTableRecord,
  groupByFields: ESQLStatsQueryMeta['groupByFields']
): string =>
  JSON.stringify(groupByFields.map(({ field }) => [field, record.flattened[field] ?? null]));

export const canCompareGridPatterns = ({
  groupByFields,
  sparkline,
  timeFieldName,
}: {
  groupByFields: ESQLStatsQueryMeta['groupByFields'];
  sparkline: CountSparkline | undefined;
  timeFieldName: string | undefined;
}): boolean => {
  // A STATS query is required for CATEGORIZE, and the histogram does not apply a breakdown
  // to transformational commands. A leftover breakdown (the logs profile defaults to
  // log.level) must not hide the action while the chart shows no breakdown.
  return (
    Boolean(getSingleCategorizeGroupField(groupByFields)) &&
    Boolean(sparkline) &&
    Boolean(timeFieldName) &&
    sparkline?.timeField === timeFieldName
  );
};

export type GridHistogramOverlayPublication =
  | DiscoverHistogramOverlaySelection
  | undefined
  | 'preserve';

/** Applies the shared publication rules to one selected regular-grid row. */
export const resolvePublishedGridHistogramOverlay = ({
  fetchStatus,
  rowsQuery,
  currentQuery,
  rowsTimeRange,
  rowsEsqlVariables,
  currentEsqlVariables,
  selectedRowId,
  selectedNodeId,
  rows,
  groupByFields,
  categorizeField,
  sparkline,
  timeRange,
}: {
  fetchStatus: FetchStatus;
  rowsQuery: string | undefined;
  currentQuery: string;
  rowsTimeRange: TimeRange | undefined;
  rowsEsqlVariables: ESQLControlVariable[] | undefined;
  currentEsqlVariables: ESQLControlVariable[] | undefined;
  selectedRowId: string | undefined;
  selectedNodeId: string | undefined;
  rows: DataTableRecord[];
  groupByFields: ESQLStatsQueryMeta['groupByFields'];
  categorizeField: string;
  sparkline: CountSparkline | undefined;
  timeRange: TimeRange | undefined;
}): GridHistogramOverlayPublication => {
  const decision = resolveHistogramOverlayPublication({
    fetchStatus,
    rowsQuery,
    currentQuery,
    expanded: selectedRowId ? { [selectedRowId]: true } : {},
    selectedNodeId,
  });

  if (decision === 'preserve') {
    return 'preserve';
  }

  if (decision === 'clear') {
    return undefined;
  }

  // Preserve stale rows before clearing transiently missing current inputs.
  if (!isEqual(rowsTimeRange, timeRange) || !isEqual(rowsEsqlVariables, currentEsqlVariables)) {
    return 'preserve';
  }

  if (!selectedRowId || !sparkline || !timeRange) {
    return undefined;
  }

  const row = rows.find(
    (record) => getGridHistogramOverlayRowId(record, groupByFields) === selectedRowId
  );
  const values = row ? readSparklineValues(row.flattened[sparkline.column]) : undefined;
  const label = row ? formatPatternLabel(row.flattened[categorizeField]) : undefined;

  if (!row || !values || label === undefined) {
    return undefined;
  }

  return buildHistogramOverlaySeries({
    nodeId: selectedRowId,
    label,
    values,
    query: currentQuery,
    timeRange,
    sparkline,
  });
};

/**
 * Forgets a requested row only when that row can no longer be published.
 * A clear caused by choosing another row while documents are loading must keep the new request.
 */
export const shouldForgetRequestedGridRow = ({
  fetchStatus,
  rowsQuery,
  currentQuery,
  publication,
}: {
  fetchStatus: FetchStatus;
  rowsQuery: string | undefined;
  currentQuery: string;
  publication: DiscoverHistogramOverlaySelection | undefined;
}): boolean => {
  if (publication) {
    return false;
  }

  if (fetchStatus === FetchStatus.ERROR) {
    return true;
  }

  return (
    (fetchStatus === FetchStatus.PARTIAL || fetchStatus === FetchStatus.COMPLETE) &&
    rowsQuery === currentQuery
  );
};

const GridHistogramOverlayPublisher = ({
  selectedRowId,
  rows,
  groupByFields,
  categorizeField,
  sparkline,
  query,
  timeRange,
  rowsTimeRange,
  currentEsqlVariables,
  rowsEsqlVariables,
  fetchStatus,
  rowsQuery,
  onRequestedRowUnavailable,
}: {
  selectedRowId: string | undefined;
  rows: DataTableRecord[];
  groupByFields: ESQLStatsQueryMeta['groupByFields'];
  categorizeField: string;
  sparkline: CountSparkline;
  query: string;
  timeRange: TimeRange | undefined;
  rowsTimeRange: TimeRange | undefined;
  currentEsqlVariables: ESQLControlVariable[] | undefined;
  rowsEsqlVariables: ESQLControlVariable[] | undefined;
  fetchStatus: FetchStatus;
  rowsQuery: string | undefined;
  onRequestedRowUnavailable: (rowId: string) => void;
}) => {
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const runtimeStateManager = useRuntimeStateManager();
  const selectedNodeId = useCurrentTabRuntimeState((tab) => tab.histogramOverlaySelection$)?.nodeId;

  useEffect(() => {
    const next = resolvePublishedGridHistogramOverlay({
      fetchStatus,
      rowsQuery,
      currentQuery: query,
      rowsTimeRange,
      rowsEsqlVariables,
      currentEsqlVariables,
      selectedRowId,
      selectedNodeId,
      rows,
      groupByFields,
      categorizeField,
      sparkline,
      timeRange,
    });

    if (next === 'preserve') {
      return;
    }

    publishHistogramOverlaySelection(runtimeStateManager, currentTabId, next);

    if (
      selectedRowId &&
      shouldForgetRequestedGridRow({
        fetchStatus,
        rowsQuery,
        currentQuery: query,
        publication: next,
      })
    ) {
      onRequestedRowUnavailable(selectedRowId);
    }
  }, [
    categorizeField,
    currentTabId,
    fetchStatus,
    groupByFields,
    onRequestedRowUnavailable,
    query,
    rows,
    rowsEsqlVariables,
    rowsQuery,
    rowsTimeRange,
    runtimeStateManager,
    currentEsqlVariables,
    selectedNodeId,
    selectedRowId,
    sparkline,
    timeRange,
  ]);

  useEffect(() => {
    return () => {
      publishHistogramOverlaySelection(runtimeStateManager, currentTabId, undefined);
    };
  }, [currentTabId, runtimeStateManager]);

  return null;
};

export interface RegularGridPatternComparison {
  rowAdditionalLeadingControls: RowControlColumn[] | undefined;
  message: ReactElement | undefined;
  publisher: ReactElement | null;
}

export const useRegularGridPatternComparison = ({
  active,
  rows,
  query,
  rowsQuery,
  fetchStatus,
  timeRange,
  rowsTimeRange,
  currentEsqlVariables,
  rowsEsqlVariables,
  timeFieldName,
  chartHidden,
  defaultHistogramAvailable,
}: {
  /** False while the cascade layout is the histogram publisher. */
  active: boolean;
  rows: DataTableRecord[];
  query: DiscoverAppState['query'];
  rowsQuery: string | undefined;
  fetchStatus: FetchStatus;
  timeRange: TimeRange | undefined;
  rowsTimeRange: TimeRange | undefined;
  currentEsqlVariables: ESQLControlVariable[] | undefined;
  rowsEsqlVariables: ESQLControlVariable[] | undefined;
  timeFieldName: string | undefined;
  chartHidden: boolean;
  /** False when a profile replaces the Unified Histogram, which cannot render this overlay. */
  defaultHistogramAvailable: boolean;
}): RegularGridPatternComparison => {
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const [selectedRowRequest, setSelectedRowRequest] = useState<
    { tabId: string; rowId: string } | undefined
  >();
  const selectedRowId =
    selectedRowRequest?.tabId === currentTabId ? selectedRowRequest.rowId : undefined;
  const histogramOverlaySelection = useCurrentTabRuntimeState(
    (tab) => tab.histogramOverlaySelection$
  );
  const histogramOverlayResult = useCurrentTabRuntimeState((tab) => tab.histogramOverlayResult$);
  const esql = isOfAggregateQueryType(query) ? query.esql : undefined;
  const sparkline = useMemo(() => (esql ? getCountSparkline(esql) : undefined), [esql]);
  const queryMeta = useMemo(() => (esql ? getESQLStatsQueryMeta(esql) : undefined), [esql]);
  const categorizeField = queryMeta
    ? getSingleCategorizeGroupField(queryMeta.groupByFields)
    : undefined;
  const compatible = Boolean(
    esql &&
      queryMeta &&
      categorizeField &&
      canCompareGridPatterns({
        groupByFields: queryMeta.groupByFields,
        sparkline,
        timeFieldName,
      })
  );
  const enabled = active && compatible && !chartHidden && defaultHistogramAvailable;

  useEffect(() => {
    if (!enabled || selectedRowRequest?.tabId !== currentTabId) {
      setSelectedRowRequest(undefined);
    }
  }, [currentTabId, enabled, selectedRowRequest?.tabId]);

  const onToggle = useCallback(
    (rowId: string) => {
      setSelectedRowRequest((current) =>
        current?.tabId === currentTabId && current.rowId === rowId
          ? undefined
          : { tabId: currentTabId, rowId }
      );
    },
    [currentTabId]
  );

  const onRequestedRowUnavailable = useCallback((rowId: string) => {
    setSelectedRowRequest((current) => (current?.rowId === rowId ? undefined : current));
  }, []);

  const patternComparison = getPatternComparisonMessageState({
    canCompare: enabled,
    chartHidden,
    selection: histogramOverlaySelection,
    result: histogramOverlayResult,
  });

  const rowAdditionalLeadingControls = useMemo<RowControlColumn[] | undefined>(() => {
    if (!enabled || !sparkline || !queryMeta || !categorizeField) {
      return undefined;
    }

    return [
      {
        id: COMPARE_PATTERN_CONTROL_ID,
        isAvailable: ({ record }) =>
          readSparklineValues(record.flattened[sparkline.column]) !== undefined &&
          formatPatternLabel(record.flattened[categorizeField]) !== undefined,
        render: (Control, { record }) => {
          const rowId = getGridHistogramOverlayRowId(record, queryMeta.groupByFields);
          const selected = rowId === selectedRowId;
          let tooltipContent = selectPatternTooltip;

          if (selected) {
            if (patternComparison === 'unavailable') {
              tooltipContent = unavailableStopTooltip;
            } else if (patternComparison === 'approximate') {
              tooltipContent = approximateStopTooltip;
            } else {
              tooltipContent = stopComparingPatternLabel;
            }
          }

          return (
            <Control
              data-test-subj="discoverComparePatternHistogram"
              iconType="chartBarVerticalStack"
              color={selected ? 'primary' : 'text'}
              label={selected ? stopComparingPatternLabel : comparePatternLabel}
              tooltipContent={tooltipContent}
              onClick={() => onToggle(rowId)}
            />
          );
        },
      },
    ];
  }, [categorizeField, enabled, onToggle, patternComparison, queryMeta, selectedRowId, sparkline]);

  const message = useMemo(
    () =>
      patternComparison === 'approximate' ? (
        <PatternComparisonMessage patternComparison="approximate" />
      ) : undefined,
    [patternComparison]
  );

  const publisher =
    enabled && esql && sparkline && queryMeta && categorizeField ? (
      <GridHistogramOverlayPublisher
        selectedRowId={selectedRowId}
        rows={rows}
        groupByFields={queryMeta.groupByFields}
        categorizeField={categorizeField}
        sparkline={sparkline}
        query={esql}
        timeRange={timeRange}
        rowsTimeRange={rowsTimeRange}
        currentEsqlVariables={currentEsqlVariables}
        rowsEsqlVariables={rowsEsqlVariables}
        fetchStatus={fetchStatus}
        rowsQuery={rowsQuery}
        onRequestedRowUnavailable={onRequestedRowUnavailable}
      />
    ) : null;

  return {
    rowAdditionalLeadingControls,
    message,
    publisher,
  };
};
