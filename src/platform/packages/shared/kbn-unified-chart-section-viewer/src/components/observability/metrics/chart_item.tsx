/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import { ACTION_INSPECT_PANEL, type QuickActionIds } from '@kbn/embeddable-plugin/public';
import type { MetricsGridSettings } from '@kbn/discover-utils';
import { getFieldSearchMatchingHighlight } from '@kbn/field-utils';
import { stableStringify } from '@kbn/std';
import type { Dimension, UnifiedMetricsGridProps, ParsedMetricItem } from '../../../types';
import type { ChartSize } from '../../chart';
import { Chart } from '../../chart';
import { buildXySeriesConfig } from '../../chart/build_xy_series_config';
import {
  createESQLQuery,
  firstNonNullable,
  getAggregationLabel,
  getMetricUniqueKey,
} from '../../../common/utils';
import type { HistogramBoundsByMetricKey } from './hooks/use_fetch_histogram_bounds';
import { useHistogramHeatmap } from './hooks/use_histogram_heatmap';
import {
  ACTION_COPY_TO_DASHBOARD,
  ACTION_EXPLORE_IN_DISCOVER_TAB,
  ACTION_OPEN_IN_DISCOVER,
  ACTION_VIEW_DETAILS,
} from '../../../common/constants';
import { useChartLayers } from '../../chart/hooks/use_chart_layers';
import { useFetchExemplars } from './hooks/use_fetch_exemplars';
import { A11yGridCell } from './a11y_grid';

const EMPTY_APPLICABLE_DIMENSIONS: Dimension[] = [];

const useStableApplicableDimensions = (
  dimensions: Dimension[],
  dimensionFields: readonly Dimension[]
): Dimension[] => {
  const stabilizedRef = useRef<{ key: string | null; value: Dimension[] }>({
    key: null,
    value: EMPTY_APPLICABLE_DIMENSIONS,
  });

  return useMemo(() => {
    const applicable = dimensions.filter((dimension) =>
      dimensionFields.some((field) => field.name === dimension.name)
    );
    const key = applicable.length === 0 ? null : stableStringify(applicable);

    if (stabilizedRef.current.key === key) {
      return stabilizedRef.current.value;
    }

    const value = applicable.length === 0 ? EMPTY_APPLICABLE_DIMENSIONS : applicable;
    stabilizedRef.current = { key, value };
    return value;
  }, [dimensions, dimensionFields]);
};

const METRICS_QUICK_ACTION_IDS: QuickActionIds = [
  ACTION_EXPLORE_IN_DISCOVER_TAB,
  ACTION_INSPECT_PANEL,
  ACTION_VIEW_DETAILS,
  ACTION_COPY_TO_DASHBOARD,
];

interface ChartItemProps
  extends Pick<
    UnifiedMetricsGridProps,
    'services' | 'onBrushEnd' | 'onFilter' | 'fetchParams' | 'actions'
  > {
  id: string;
  metricItem: ParsedMetricItem;
  index: number;
  size: ChartSize;
  dimensions: Dimension[];
  discoverFetch$: UnifiedMetricsGridProps['fetch$'];
  rowIndex: number;
  colIndex: number;
  isFocused: boolean;
  isSelected: boolean;
  searchTerm?: string;
  onFocusCell: (rowIndex: number, colIndex: number) => void;
  onViewDetails: (index: number, esqlQuery: string, metricItem: ParsedMetricItem) => void;
  description?: string;
  whereStatements?: string[];
  userSource?: string;
  userMessages?: EmbeddableComponentProps['userMessages'];
  profileId: string;
  gridSettings: MetricsGridSettings;
  onMetricExplored?: (metricUniqueKey: string) => void;
  isComponentVisible: boolean;
  histogramBounds: HistogramBoundsByMetricKey;
  histogramBoundsLoading: boolean;
}

export const ChartItem = React.memo(
  ({
    id,
    metricItem,
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
    isSelected,
    searchTerm,
    whereStatements,
    userSource,
    description,
    onFocusCell,
    onViewDetails,
    userMessages,
    profileId,
    gridSettings,
    onMetricExplored,
    isComponentVisible,
    histogramBounds,
    histogramBoundsLoading,
  }: ChartItemProps) => {
    const { euiTheme } = useEuiTheme();
    const colorPalette = useMemo(
      () => Object.values(euiTheme.colors.vis).slice(0, 10),
      [euiTheme.colors.vis]
    );

    const recordExploredMetric = useCallback<React.MouseEventHandler<HTMLDivElement>>(
      (event) => {
        // Only count clicks on panel action controls (Inspect, View details, Explore in
        // Discover, Copy to dashboard, and the overflow menu that hosts Cases), not clicks
        // on the chart body, legend, or time series selection.
        const isActionClick = (event.target as HTMLElement).closest(
          '[data-test-subj^="embeddablePanelAction-"], [data-test-subj="embeddablePanelToggleMenuIcon"]'
        );
        if (isActionClick) {
          onMetricExplored?.(getMetricUniqueKey(metricItem));
        }
      },
      [onMetricExplored, metricItem]
    );

    const applicableDimensions = useStableApplicableDimensions(
      dimensions,
      metricItem.dimensionFields
    );

    const exemplars = useFetchExemplars({
      fetchParams,
      services,
      metricItem,
      whereStatements,
      originalSource: userSource,
      profileId,
      isComponentVisible,
    });
    // TODO(kibana#289722): feed `exemplars` into useChartLayers as a points layer.
    void exemplars;

    const { shouldRenderHistogram, boundsError, distributionQuery, heatmapConfig } =
      useHistogramHeatmap({
        metricItem,
        applicableDimensions,
        histogramBounds,
        histogramBoundsLoading,
        whereStatements,
        originalSource: userSource,
        histogramPercentile: gridSettings.histogramPercentile,
      });

    const esqlQuery = useMemo(() => {
      if (shouldRenderHistogram) {
        return distributionQuery ?? '';
      }
      const fieldType = firstNonNullable(metricItem.fieldTypes);
      const isSupported = fieldType !== 'unsigned_long';
      return isSupported
        ? createESQLQuery({
            metricItem,
            splitAccessors: applicableDimensions.map((dim) => dim.name),
            whereStatements,
            originalSource: userSource,
            gridSettings,
          })
        : '';
    }, [
      shouldRenderHistogram,
      distributionQuery,
      metricItem,
      applicableDimensions,
      whereStatements,
      userSource,
      gridSettings,
    ]);

    const color = useMemo(() => colorPalette[index % colorPalette.length], [index, colorPalette]);

    const yAxisTitle = useMemo(() => {
      const instrument = firstNonNullable(metricItem.metricTypes);
      return instrument ? getAggregationLabel({ instrument, gridSettings }) : undefined;
    }, [metricItem.metricTypes, gridSettings]);

    const chartLayers = useChartLayers({
      dimensions: applicableDimensions,
      metricItem,
      color,
      gridSettings,
    });

    const lensConfig = useMemo(() => {
      if (heatmapConfig) {
        return heatmapConfig;
      }

      // Bounds are loading or failed. No series yet; the empty XY config keeps the
      // loader or the bounds error.
      if (shouldRenderHistogram) {
        return buildXySeriesConfig({
          query: '',
          title: metricItem.metricName,
          description,
          chartLayers: [],
        });
      }

      return buildXySeriesConfig({
        query: esqlQuery,
        title: metricItem.metricName,
        description,
        chartLayers,
        yAxisTitle,
      });
    }, [
      heatmapConfig,
      shouldRenderHistogram,
      metricItem.metricName,
      description,
      esqlQuery,
      chartLayers,
      yAxisTitle,
    ]);

    const handleViewDetailsCallback = useCallback(
      () => onViewDetails(index, esqlQuery, metricItem),
      [index, esqlQuery, metricItem, onViewDetails]
    );

    const titleHighlight = useMemo(() => {
      if (!searchTerm?.trim()) {
        return undefined;
      }
      return getFieldSearchMatchingHighlight(metricItem.metricName, searchTerm.trim());
    }, [metricItem.metricName, searchTerm]);

    return (
      <A11yGridCell
        id={id}
        rowIndex={rowIndex}
        colIndex={colIndex}
        index={index}
        isFocused={isFocused}
        isSelected={isSelected}
        onFocus={onFocusCell}
        onClickCapture={recordExploredMetric}
      >
        <Chart
          id={metricItem.metricName}
          isSelected={isSelected}
          lensConfig={lensConfig}
          disableClickFilter={lensConfig.chartType === 'heatmap'}
          size={size}
          discoverFetch$={discoverFetch$}
          fetchParams={fetchParams}
          services={services}
          onBrushEnd={onBrushEnd}
          onFilter={onFilter}
          onExploreInDiscoverTab={actions.openInNewTab}
          onViewDetails={handleViewDetailsCallback}
          isLoading={shouldRenderHistogram && histogramBoundsLoading}
          error={shouldRenderHistogram ? boundsError : undefined}
          syncCursor
          syncTooltips={false}
          titleHighlight={titleHighlight}
          extraDisabledActions={[ACTION_OPEN_IN_DISCOVER]}
          quickActionIds={METRICS_QUICK_ACTION_IDS}
          userMessages={userMessages}
          profileId={profileId}
        />
      </A11yGridCell>
    );
  }
);

ChartItem.displayName = 'ChartItem';
