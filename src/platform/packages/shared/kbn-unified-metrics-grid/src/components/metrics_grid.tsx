/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
import { EuiFlexGrid, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { Observable } from 'rxjs';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
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
  columns: EuiFlexGridProps['columns'];
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
  filters = [],
}: MetricsGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
      const chartIndex = rows.findIndex((row) => `chart-${row.key}` === chartId);
      const { rowIndex, colIndex } = getRowColFromIndex(chartIndex);

      setExpandedMetric({ metric, esqlQuery, chartId, rowIndex, colIndex });
      dismissAllFlyoutsExceptFor(DiscoverFlyouts.metricInsights);
    },
    [rows, getRowColFromIndex]
  );

  const handleCloseFlyout = useCallback(() => {
    if (expandedMetric) {
      // Use setTimeout to ensure the flyout is fully closed before focusing
      setTimeout(() => {
        focusCell(expandedMetric.rowIndex, expandedMetric.colIndex);
      }, 0);
    }
    setExpandedMetric(undefined);
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

  // TODO: find a better way to handle conflicts with other flyouts
  // https://github.com/elastic/kibana/issues/237965
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest('[data-test-subj="embeddablePanelAction-openInspector"]')) {
        if (expandedMetric) {
          handleCloseFlyout();
        }
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [expandedMetric, handleCloseFlyout]);

  const normalizedFields = useMemo(() => (Array.isArray(fields) ? fields : [fields]), [fields]);

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <FieldsMetadataProvider fields={normalizedFields} services={services}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={i18n.translate('metricsExperience.gridAriaLabel', {
          defaultMessage: 'Metric charts grid. Use arrow keys to navigate.',
        })}
        aria-rowcount={gridRows}
        aria-colcount={gridColumns}
        onKeyDown={handleKeyDown}
        data-test-subj="unifiedMetricsExperienceGrid"
        tabIndex={0}
        style={{
          outline: 'none',
        }}
      >
        <EuiFlexGrid columns={columns} gutterSize="s">
          {rows.map(({ key, metric }, index) => {
            return (
              // Use the index as a key to prevent the charts from unmounting
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
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </div>
      {expandedMetric && (
        <MetricInsightsFlyout
          chartRef={getChartRefForFocus()}
          metric={expandedMetric.metric}
          esqlQuery={expandedMetric.esqlQuery}
          isOpen
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
}: {
  chartId: string;
  metric: MetricField;
  index: number;
  getRowColFromIndex: (index: number) => { rowIndex: number; colIndex: number };
  focusedCell: { rowIndex: number; colIndex: number };
  dimensions: string[];
  filters: Array<{ field: string; value: string }>;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  handleViewDetails: (esqlQuery: string, metric: MetricField, chartId: string) => void;
  size: ChartSize;
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
    <div
      id={chartId}
      ref={(element) => setChartRef(chartId, element)}
      role="gridcell"
      aria-rowindex={rowIndex + 1}
      aria-colindex={colIndex + 1}
      data-grid-cell={`${rowIndex}-${colIndex}`}
      data-chart-index={index}
      tabIndex={isFocused ? 0 : -1}
      onFocus={() => handleFocusCell(rowIndex, colIndex)}
      style={{
        outline: 'none',
        cursor: 'pointer',
        ...(isFocused && {
          boxShadow: `inset 0 0 0 2px ${euiTheme.colors.primary}`,
          borderRadius: euiTheme.border.radius.medium,
        }),
      }}
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
        chartLayers={chartLayers}
      />
    </div>
  );
}
