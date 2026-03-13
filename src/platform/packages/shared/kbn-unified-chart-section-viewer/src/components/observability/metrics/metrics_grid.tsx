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
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import type { MetricField, Dimension, UnifiedMetricsGridProps } from '../../../types';
import type { ChartSize } from '../../chart';
import { Chart } from '../../chart';
import { MetricInsightsFlyout } from '../../flyout/metrics_insights_flyout';
import { EmptyState } from '../../empty_state/empty_state';
import { useGridNavigation } from '../../../hooks/use_grid_navigation';
import { FieldsMetadataProvider } from '../../../context/fields_metadata';
import {
  createESQLQuery,
  createM4DownsampledESQLQuery,
  M4_VALUE_COLUMN,
} from '../../../common/utils';
import { ACTION_OPEN_IN_DISCOVER } from '../../../common/constants';
import { useChartLayers } from '../../chart/hooks/use_chart_layers';

const AVG_TARGET_BUCKETS = 100000;
const M4_TARGET_BUCKETS = 100;

export type MetricsGridProps = Pick<
  UnifiedMetricsGridProps,
  'services' | 'onBrushEnd' | 'onFilter' | 'fetchParams' | 'actions'
> & {
  dimensions: Dimension[];
  searchTerm?: string;
  columns: NonNullable<EuiFlexGridProps['columns']>;
  discoverFetch$: UnifiedMetricsGridProps['fetch$'];
  fields: MetricField[];
  whereStatements?: string[];
  getUserMessages?: (metric: MetricField) => EmbeddableComponentProps['userMessages'];
  useM4Downsampling?: boolean;
};

const getItemKey = (metric: MetricField, index: number) => {
  return `${metric.name}-${index}`;
};
export const MetricsGrid = ({
  fields,
  onBrushEnd,
  onFilter,
  actions,
  dimensions,
  whereStatements,
  services,
  columns,
  fetchParams,
  discoverFetch$,
  searchTerm,
  getUserMessages,
  useM4Downsampling,
}: MetricsGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
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
          css={
            useM4Downsampling
              ? css`
                  grid-template-columns: 1fr;
                `
              : css`
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
                `
          }
        >
          {fields.map((metric, index) => {
            const id = getItemKey(metric, index);
            const { rowIndex, colIndex } = getRowColFromIndex(index);
            const isFocused =
              focusedCell.rowIndex === rowIndex && focusedCell.colIndex === colIndex;

            return (
              <EuiFlexItem key={id}>
                <ChartItem
                  id={id}
                  index={index}
                  metric={metric}
                  size="s"
                  dimensions={dimensions}
                  services={services}
                  onBrushEnd={onBrushEnd}
                  onFilter={onFilter}
                  actions={actions}
                  fetchParams={fetchParams}
                  discoverFetch$={discoverFetch$}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  isFocused={isFocused}
                  onFocusCell={handleFocusCell}
                  onViewDetails={handleViewDetails}
                  searchTerm={searchTerm}
                  whereStatements={whereStatements}
                  userMessages={getUserMessages ? getUserMessages(metric) : undefined}
                  useM4Downsampling={useM4Downsampling}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </A11yGridWrapper>
      {expandedMetric && (
        <MetricInsightsFlyout
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
    UnifiedMetricsGridProps,
    'services' | 'onBrushEnd' | 'onFilter' | 'fetchParams' | 'actions'
  > {
  id: string;
  metric: MetricField;
  index: number;
  size: ChartSize;
  dimensions: Dimension[];
  discoverFetch$: UnifiedMetricsGridProps['fetch$'];
  rowIndex: number;
  colIndex: number;
  isFocused: boolean;
  searchTerm?: string;
  onFocusCell: (rowIndex: number, colIndex: number) => void;
  onViewDetails: (index: number, esqlQuery: string, metric: MetricField) => void;
  whereStatements?: string[];
  userMessages?: EmbeddableComponentProps['userMessages'];
  useM4Downsampling?: boolean;
}

const ChartItem = React.memo(
  ({
    id,
    metric,
    index,
    size,
    dimensions,
    services,
    onBrushEnd,
    onFilter,
    actions,
    fetchParams,
    discoverFetch$,
    rowIndex,
    colIndex,
    isFocused,
    searchTerm,
    whereStatements,
    onFocusCell,
    onViewDetails,
    userMessages,
    useM4Downsampling,
  }: ChartItemProps) => {
    const { euiTheme } = useEuiTheme();
    const colorPalette = useMemo(
      () => Object.values(euiTheme.colors.vis).slice(0, 10),
      [euiTheme.colors.vis]
    );

    const isM4Compatible =
      useM4Downsampling && metric.instrument !== 'counter' && metric.instrument !== 'histogram';

    const standardQuery = useMemo(() => {
      const isSupported = metric.type !== 'unsigned_long';
      if (!isSupported) return '';

      return createESQLQuery({
        metric,
        splitAccessors: dimensions.map((dim) => dim.name),
        whereStatements,
        useFrom: isM4Compatible,
        targetBuckets: isM4Compatible ? AVG_TARGET_BUCKETS : undefined,
      });
    }, [metric, dimensions, whereStatements, isM4Compatible]);

    const m4Query = useMemo(() => {
      if (!isM4Compatible) return '';
      const isSupported = metric.type !== 'unsigned_long';
      if (!isSupported) return '';

      return createM4DownsampledESQLQuery({
        metric,
        whereStatements,
        sourceBuckets: AVG_TARGET_BUCKETS,
        targetBuckets: M4_TARGET_BUCKETS,
      });
    }, [metric, whereStatements, isM4Compatible]);

    const color = useMemo(() => colorPalette[index % colorPalette.length], [index, colorPalette]);
    const standardChartLayers = useChartLayers({
      dimensions,
      metric,
      color,
      seriesType: isM4Compatible ? 'line' : undefined,
      targetBuckets: isM4Compatible ? AVG_TARGET_BUCKETS : undefined,
    });

    const m4ChartLayers = useMemo(
      () => [
        {
          type: 'series' as const,
          seriesType: 'line' as const,
          xAxis: { field: '@timestamp', type: 'dateHistogram' as const },
          yAxis: [
            {
              value: M4_VALUE_COLUMN,
              label: metric.name,
              compactValues: true,
              seriesColor: color,
            },
          ],
        },
      ],
      [metric.name, color]
    );

    const activeQuery = isM4Compatible ? m4Query : standardQuery;
    const handleViewDetailsCallback = useCallback(
      () => onViewDetails(index, activeQuery, metric),
      [index, activeQuery, metric, onViewDetails]
    );

    const sharedChartProps = {
      size: isM4Compatible ? ('m' as ChartSize) : size,
      discoverFetch$,
      fetchParams,
      services,
      onBrushEnd,
      onFilter,
      onExploreInDiscoverTab: actions.openInNewTab,
      extraDisabledActions: [ACTION_OPEN_IN_DISCOVER],
    };

    if (isM4Compatible) {
      return (
        <A11yGridCell
          id={id}
          rowIndex={rowIndex}
          colIndex={colIndex}
          index={index}
          isFocused={isFocused}
          onFocus={onFocusCell}
        >
          <EuiFlexGroup gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <strong>{metric.name}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <div css={css({ marginBottom: euiTheme.size.xs })}>
                <EuiBadge color="hollow">
                  {i18n.translate('metricsExperience.m4Comparison.standardLabel', {
                    defaultMessage: 'Standard (AVG) · up to {count} data points',
                    values: { count: AVG_TARGET_BUCKETS.toLocaleString() },
                  })}
                </EuiBadge>
              </div>
              <Chart
                {...sharedChartProps}
                esqlQuery={standardQuery}
                title={`${metric.name} — Standard`}
                chartLayers={standardChartLayers}
                titleHighlight={searchTerm}
                onViewDetails={handleViewDetailsCallback}
                userMessages={userMessages}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <div css={css({ marginBottom: euiTheme.size.xs })}>
                <EuiBadge color="accent">
                  {i18n.translate('metricsExperience.m4Comparison.m4Label', {
                    defaultMessage: 'M4 Downsampled · ~{count} data points',
                    values: { count: (M4_TARGET_BUCKETS * 4).toLocaleString() },
                  })}
                </EuiBadge>
              </div>
              <Chart
                {...sharedChartProps}
                esqlQuery={m4Query}
                title={`${metric.name} — M4`}
                chartLayers={m4ChartLayers}
                titleHighlight={searchTerm}
                onViewDetails={handleViewDetailsCallback}
                userMessages={userMessages}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </A11yGridCell>
      );
    }

    return (
      <A11yGridCell
        id={id}
        rowIndex={rowIndex}
        colIndex={colIndex}
        index={index}
        isFocused={isFocused}
        onFocus={onFocusCell}
      >
        <Chart
          {...sharedChartProps}
          esqlQuery={standardQuery}
          title={metric.name}
          chartLayers={standardChartLayers}
          titleHighlight={searchTerm}
          onViewDetails={handleViewDetailsCallback}
          userMessages={userMessages}
        />
      </A11yGridCell>
    );
  }
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
