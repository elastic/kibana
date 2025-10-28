/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
import { EuiFlexGrid, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { Observable } from 'rxjs';
import { css } from '@emotion/react';
import type { ChartSize } from './chart';
import { Chart } from './chart';
import { MetricInsightsFlyout } from './flyout/metrics_insights_flyout';
import { EmptyState } from './empty_state/empty_state';
import { useGridNavigation } from '../hooks/use_grid_navigation';
import { FieldsMetadataProvider } from '../context/fields_metadata';
import { createESQLQuery } from '../common/utils';
import { useChartLayers } from './chart/hooks/use_chart_layers';

export type MetricsGridProps = Pick<
  ChartSectionProps,
  'searchSessionId' | 'services' | 'onBrushEnd' | 'onFilter' | 'abortController' | 'requestParams'
> & {
  filters?: Array<{ field: string; value: string }>;
  dimensions: string[];
  searchTerm?: string;
  columns: NonNullable<EuiFlexGridProps['columns']>;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
} & (
    | {
        pivotOn: 'metric';
        fields: MetricField[];
      }
    | {
        pivotOn: 'dimension';
        fields: MetricField;
      }
  );

export const MetricsGrid = ({
  fields,
  searchSessionId,
  onBrushEnd,
  onFilter,
  dimensions,
  pivotOn,
  services,
  columns,
  abortController,
  requestParams,
  discoverFetch$,
  searchTerm,
  filters = [],
}: MetricsGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { euiTheme } = useEuiTheme();

  const chartSize = useMemo(() => (columns === 2 || columns === 4 ? 's' : 'm'), [columns]);

  const [expandedMetric, setExpandedMetric] = useState<
    | {
        metric: MetricField;
        esqlQuery: string;
        chartId: string;
        rowIndex: number;
        colIndex: number;
      }
    | undefined
  >();

  const rows = useMemo(() => {
    return pivotOn === 'metric'
      ? fields.map((field, i) => ({ key: `${field.name}-${i}`, metric: field }))
      : dimensions.map((dim, i) => ({ key: `${dim}-${i}`, metric: fields }));
  }, [pivotOn, fields, dimensions]);

  const gridColumns = columns || 1;
  const gridRows = Math.ceil(rows.length / gridColumns);

  const { focusedCell, handleKeyDown, getRowColFromIndex, handleFocusCell, focusCell } =
    useGridNavigation({
      gridColumns,
      gridRows,
      totalRows: rows.length,
      gridRef,
    });

  const setChartRef = useCallback((chartId: string, element: HTMLDivElement | null) => {
    if (element) {
      chartRefs.current.set(chartId, element);
    } else {
      chartRefs.current.delete(chartId);
    }
  }, []);

  const handleViewDetails = useCallback(
    (esqlQuery: string, metric: MetricField, chartId: string) => {
      const chartIndex = rows.findIndex((row) => row.key === chartId);
      const { rowIndex, colIndex } = getRowColFromIndex(chartIndex);

      setExpandedMetric({ metric, esqlQuery, chartId, rowIndex, colIndex });
    },
    [rows, getRowColFromIndex]
  );

  const handleCloseFlyout = useCallback(() => {
    if (!expandedMetric) {
      return;
    }

    const rowIndex = expandedMetric.rowIndex;
    const colIndex = expandedMetric.colIndex;
    setExpandedMetric(undefined);
    // Use requestAnimationFrame to ensure the flyout is fully closed before focusing
    requestAnimationFrame(() => {
      focusCell(rowIndex, colIndex);
    });
  }, [expandedMetric, focusCell]);

  const getChartRefForFocus = useCallback(() => {
    if (expandedMetric?.chartId) {
      const chartElement = chartRefs.current.get(expandedMetric.chartId);
      if (chartElement) {
        return { current: chartElement };
      }
    }
    return { current: null };
  }, [expandedMetric?.chartId]);

  const normalizedFields = useMemo(() => (Array.isArray(fields) ? fields : [fields]), [fields]);

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <FieldsMetadataProvider fields={normalizedFields} services={services}>
      <A11yGridWrapper
        ref={gridRef}
        aria-label={i18n.translate('metricsExperience.gridAriaLabel', {
          defaultMessage: 'Metric charts grid. Use arrow keys to navigate.',
        })}
        gridRows={gridRows}
        gridColumns={gridColumns}
        onKeyDown={handleKeyDown}
        data-test-subj="unifiedMetricsExperienceGrid"
      >
        <EuiFlexGrid
          gutterSize="s"
          css={css`
            grid-template-columns: repeat(${Math.min(columns, 4)}, 1fr);
            @container (max-width: ${euiTheme.breakpoint.xl}px) {
              grid-template-columns: repeat(${Math.min(columns, 3)}, 1fr);
            }
            @container (max-width: ${euiTheme.breakpoint.l}px) {
              grid-template-columns: repeat(${Math.min(columns, 2)}, 1fr);
            }
            @container (max-width: ${euiTheme.breakpoint.s}px) {
              grid-template-columns: repeat(${Math.min(columns, 1)}, 1fr);
            }
          `}
        >
          {rows.map(({ key, metric }, index) => {
            return (
              <EuiFlexItem key={index}>
                <ChartItem
                  chartId={key}
                  metric={metric}
                  index={index}
                  getRowColFromIndex={getRowColFromIndex}
                  focusedCell={focusedCell}
                  dimensions={dimensions}
                  filters={filters}
                  discoverFetch$={discoverFetch$}
                  handleViewDetails={handleViewDetails}
                  searchSessionId={searchSessionId}
                  services={services}
                  onBrushEnd={onBrushEnd}
                  onFilter={onFilter}
                  abortController={abortController}
                  requestParams={requestParams}
                  size={chartSize}
                  setChartRef={setChartRef}
                  handleFocusCell={handleFocusCell}
                  searchTerm={searchTerm}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </A11yGridWrapper>
      {expandedMetric && (
        <MetricInsightsFlyout
          chartRef={getChartRefForFocus()}
          metric={expandedMetric.metric}
          esqlQuery={expandedMetric.esqlQuery}
          onClose={handleCloseFlyout}
        />
      )}
    </FieldsMetadataProvider>
  );
};

function ChartItem({
  chartId,
  metric,
  index,
  getRowColFromIndex,
  focusedCell,
  dimensions,
  filters,
  searchSessionId,
  services,
  onBrushEnd,
  onFilter,
  abortController,
  requestParams,
  discoverFetch$,
  handleViewDetails,
  size,
  setChartRef,
  handleFocusCell,
  searchTerm,
}: {
  chartId: string;
  metric: MetricField;
  index: number;
  focusedCell: { rowIndex: number; colIndex: number };
  dimensions: string[];
  filters: Array<{ field: string; value: string }>;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  size: ChartSize;
  searchTerm?: string;
  getRowColFromIndex: (index: number) => { rowIndex: number; colIndex: number };
  handleViewDetails: (esqlQuery: string, metric: MetricField, chartId: string) => void;
  setChartRef: (chartId: string, element: HTMLDivElement | null) => void;
  handleFocusCell: (rowIndex: number, colIndex: number) => void;
} & Pick<
  ChartSectionProps,
  'searchSessionId' | 'services' | 'onBrushEnd' | 'onFilter' | 'abortController' | 'requestParams'
>) {
  const { euiTheme } = useEuiTheme();
  const colorPalette = useMemo(
    () => Object.values(euiTheme.colors.vis).slice(0, 10),
    [euiTheme.colors.vis]
  );

  const { rowIndex, colIndex } = getRowColFromIndex(index);
  const isFocused = focusedCell.rowIndex === rowIndex && focusedCell.colIndex === colIndex;

  const isSupported = metric.type !== 'unsigned_long' && metric.type !== 'histogram';
  const esqlQuery = isSupported
    ? createESQLQuery({
        metric,
        dimensions,
        filters,
      })
    : '';
  const color = colorPalette[index % colorPalette.length];
  const chartLayers = useChartLayers({ dimensions, metric, color });

  return (
    <A11yGridCell
      id={chartId}
      ref={(element) => setChartRef(chartId, element)}
      rowIndex={rowIndex}
      colIndex={colIndex}
      index={index}
      isFocused={isFocused}
      onFocus={handleFocusCell}
    >
      <Chart
        esqlQuery={esqlQuery}
        size={size}
        discoverFetch$={discoverFetch$}
        requestParams={requestParams}
        services={services}
        abortController={abortController}
        searchSessionId={searchSessionId}
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        onViewDetails={() => handleViewDetails(esqlQuery, metric, chartId)}
        title={metric.name}
        titleHighlight={searchTerm}
        chartLayers={chartLayers}
      />
    </A11yGridCell>
  );
}

const A11yGridWrapper = React.forwardRef(
  (
    {
      children,
      gridRows,
      gridColumns,
      onKeyDown,
    }: React.PropsWithChildren<{
      gridRows: number;
      gridColumns: number;
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    }>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    return (
      <div
        ref={ref}
        role="grid"
        aria-label={i18n.translate('metricsExperience.gridAriaLabel', {
          defaultMessage: 'Metric charts grid. Use arrow keys to navigate.',
        })}
        aria-rowcount={gridRows}
        aria-colcount={gridColumns}
        onKeyDown={onKeyDown}
        data-test-subj="unifiedMetricsExperienceGrid"
        tabIndex={0}
        css={css`
          outline: none;
          container-type: inline-size;
        `}
      >
        {children}
      </div>
    );
  }
);

const A11yGridCell = React.forwardRef(
  (
    {
      id,
      children,
      rowIndex,
      colIndex,
      index,
      isFocused,
      onFocus,
    }: React.PropsWithChildren<{
      id: string;
      rowIndex: number;
      colIndex: number;
      index: number;
      isFocused: boolean;
      onFocus: (rowIndex: number, colIndex: number) => void;
    }>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    const { euiTheme } = useEuiTheme();

    const handleFocusCell = useCallback(
      () => onFocus(rowIndex, colIndex),
      [onFocus, rowIndex, colIndex]
    );

    return (
      <div
        id={id}
        ref={ref}
        role="gridcell"
        aria-rowindex={rowIndex + 1}
        aria-colindex={colIndex + 1}
        data-grid-cell={`${rowIndex}-${colIndex}`}
        data-chart-index={index}
        tabIndex={isFocused ? 0 : -1}
        onFocus={handleFocusCell}
        css={css`
          outline: none,
          cursor: pointer,
          ${
            isFocused && {
              boxShadow: `0 0 ${euiTheme.focus.width} ${euiTheme.colors.primary}`,
              borderRadius: euiTheme.border.radius.medium,
            }
          }

        `}
      >
        {children}
      </div>
    );
  }
);
