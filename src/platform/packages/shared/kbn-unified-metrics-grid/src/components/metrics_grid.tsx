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
import type { MetricField, DimensionFilters } from '@kbn/metrics-experience-plugin/common/types';
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
  filters?: DimensionFilters;
  dimensions: string[];
  searchTerm?: string;
  columns: NonNullable<EuiFlexGridProps['columns']>;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  fields: MetricField[];
};

const getItemKey = (metric: MetricField, index: number) => {
  return `${metric.name}-${index}`;
};
export const MetricsGrid = ({
  fields,
  searchSessionId,
  onBrushEnd,
  onFilter,
  dimensions,
  services,
  columns,
  abortController,
  requestParams,
  discoverFetch$,
  searchTerm,
  filters = {},
}: MetricsGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { euiTheme } = useEuiTheme();

  const [expandedMetric, setExpandedMetric] = useState<
    | {
        index: number;
        metric: MetricField;
        esqlQuery: string;
      }
    | undefined
  >();

  const gridColumns = columns || 1;
  const gridRows = Math.ceil(fields.length / gridColumns);

  const { focusedCell, handleKeyDown, getRowColFromIndex, handleFocusCell, focusCell } =
    useGridNavigation({
      gridColumns,
      gridRows,
      totalRows: fields.length,
      gridRef,
    });

  const setChartRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      chartRefs.current.set(id, element);
    } else {
      chartRefs.current.delete(id);
    }
  }, []);

  const handleViewDetails = useCallback((index: number, esqlQuery: string, metric: MetricField) => {
    setExpandedMetric({ index, metric, esqlQuery });
  }, []);

  const handleCloseFlyout = useCallback(() => {
    if (!expandedMetric) {
      return;
    }

    const { rowIndex, colIndex } = getRowColFromIndex(expandedMetric.index);
    setExpandedMetric(undefined);
    // Use requestAnimationFrame to ensure the flyout is fully closed before focusing
    requestAnimationFrame(() => {
      focusCell(rowIndex, colIndex);
    });
  }, [expandedMetric, focusCell, getRowColFromIndex]);

  const getChartRefForFocus = useCallback(() => {
    if (expandedMetric !== undefined) {
      const chartId = getItemKey(expandedMetric.metric, expandedMetric.index);
      const chartElement = chartRefs.current.get(chartId);
      if (chartElement) {
        return { current: chartElement };
      }
    }
    return { current: null };
  }, [expandedMetric]);

  if (fields.length === 0) {
    return <EmptyState />;
  }

  return (
    <FieldsMetadataProvider fields={fields} services={services}>
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
          {fields.map((metric, index) => {
            const id = getItemKey(metric, index);
            const { rowIndex, colIndex } = getRowColFromIndex(index);
            const isFocused =
              focusedCell.rowIndex === rowIndex && focusedCell.colIndex === colIndex;

            return (
              <EuiFlexItem key={index}>
                <ChartItem
                  id={id}
                  index={index}
                  ref={(element) => setChartRef(id, element)}
                  metric={metric}
                  size="s"
                  dimensions={dimensions}
                  filters={filters}
                  searchSessionId={searchSessionId}
                  services={services}
                  onBrushEnd={onBrushEnd}
                  onFilter={onFilter}
                  abortController={abortController}
                  requestParams={requestParams}
                  discoverFetch$={discoverFetch$}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  isFocused={isFocused}
                  onFocusCell={handleFocusCell}
                  onViewDetails={handleViewDetails}
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

interface ChartItemProps
  extends Pick<
    ChartSectionProps,
    'searchSessionId' | 'services' | 'onBrushEnd' | 'onFilter' | 'abortController' | 'requestParams'
  > {
  id: string;
  metric: MetricField;
  index: number;
  size: ChartSize;
  dimensions: string[];
  filters: DimensionFilters;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  rowIndex: number;
  colIndex: number;
  isFocused: boolean;
  searchTerm?: string;
  onFocusCell: (rowIndex: number, colIndex: number) => void;
  onViewDetails: (index: number, esqlQuery: string, metric: MetricField) => void;
}

const ChartItem = React.memo(
  React.forwardRef<HTMLDivElement, ChartItemProps>(
    (
      {
        id,
        metric,
        index,
        size,
        dimensions,
        filters,
        searchSessionId,
        services,
        onBrushEnd,
        onFilter,
        abortController,
        requestParams,
        discoverFetch$,
        rowIndex,
        colIndex,
        isFocused,
        searchTerm,
        onFocusCell,
        onViewDetails,
      }: ChartItemProps,
      ref
    ) => {
      const { euiTheme } = useEuiTheme();
      const colorPalette = useMemo(
        () => Object.values(euiTheme.colors.vis).slice(0, 10),
        [euiTheme.colors.vis]
      );

      const esqlQuery = useMemo(() => {
        const isSupported = metric.type !== 'unsigned_long' && metric.type !== 'histogram';
        return isSupported
          ? createESQLQuery({
              metric,
              dimensions,
              filters,
            })
          : '';
      }, [metric, dimensions, filters]);

      const color = useMemo(() => colorPalette[index % colorPalette.length], [index, colorPalette]);
      const chartLayers = useChartLayers({ dimensions, metric, color });
      const handleViewDetailsCallback = useCallback(
        () => onViewDetails(index, esqlQuery, metric),
        [index, esqlQuery, metric, onViewDetails]
      );

      return (
        <A11yGridCell
          id={id}
          ref={ref}
          rowIndex={rowIndex}
          colIndex={colIndex}
          index={index}
          isFocused={isFocused}
          onFocus={onFocusCell}
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
            onViewDetails={handleViewDetailsCallback}
            title={metric.name}
            chartLayers={chartLayers}
            titleHighlight={searchTerm}
          />
        </A11yGridCell>
      );
    }
  )
);

ChartItem.displayName = 'ChartItem';

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
