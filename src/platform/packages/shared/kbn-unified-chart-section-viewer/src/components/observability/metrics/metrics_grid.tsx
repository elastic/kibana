/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
import { EuiFlexGrid, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import type { Dimension, UnifiedMetricsGridProps, ParsedMetricItem } from '../../../types';
import { MetricInsightsFlyout } from '../../flyout';
import { EmptyState } from '../../empty_state/empty_state';
import { useGridNavigation } from '../../../hooks/use_grid_navigation';
import { FieldsMetadataProvider } from '../../../context/fields_metadata';
import { getMetricUniqueKey } from '../../../common/utils';
import type { HistogramBoundsByMetricKey } from './hooks/use_fetch_histogram_bounds';
import { useMetricsExperienceState } from './context/metrics_experience_state_provider';
import { A11yGridWrapper } from './a11y_grid';
import { ChartItem } from './chart_item';

export type MetricsGridProps = Pick<
  UnifiedMetricsGridProps,
  'services' | 'onBrushEnd' | 'onFilter' | 'fetchParams' | 'actions'
> & {
  dimensions: Dimension[];
  searchTerm?: string;
  columns: NonNullable<EuiFlexGridProps['columns']>;
  discoverFetch$: UnifiedMetricsGridProps['fetch$'];
  metricItems: ParsedMetricItem[];
  whereStatements?: string[];
  userSource?: string;
  getUserMessages?: (metricItem: ParsedMetricItem) => EmbeddableComponentProps['userMessages'];
  getDescription?: (metricItem: ParsedMetricItem) => EmbeddableComponentProps['description'];
  /**
   * Whether the owning Discover tab is the currently active one.
   *
   * Discover keeps inactive tabs' chart sections mounted to preserve internal
   * state (e.g. Lens), so without this gate every tab with a persisted flyout
   * would render its own `MetricInsightsFlyout` into `document.body` via
   * `EuiPortal`, causing visual collisions and event-capture conflicts across
   * tabs (e.g. opening a flyout in tab A would close the flyout in tab B,
   * and duplicating a tab would lose the persisted flyout).
   *
   */
  isTabSelected: boolean;
  /**
   * `ChartsGrid` hides an inactive grid with CSS rather than unmounting it, so per-chart
   * fetches that should pause while hidden (exemplars) need this flag explicitly.
   */
  isComponentVisible: boolean;
  /** Min/max fetched for the visible histogram charts. Empty until the heatmaps flag is on. */
  histogramBounds?: HistogramBoundsByMetricKey;
  histogramBoundsLoading?: boolean;
};

const EMPTY_HISTOGRAM_BOUNDS: HistogramBoundsByMetricKey = new Map();

const getItemKey = (metricItem: ParsedMetricItem, index: number) => {
  return `${metricItem.metricName}-${index}`;
};
export const MetricsGrid = ({
  metricItems,
  onBrushEnd,
  onFilter,
  actions,
  dimensions,
  whereStatements,
  userSource,
  services,
  columns,
  fetchParams,
  discoverFetch$,
  searchTerm,
  getUserMessages,
  getDescription,
  isTabSelected,
  isComponentVisible,
  histogramBounds = EMPTY_HISTOGRAM_BOUNDS,
  histogramBoundsLoading = false,
}: MetricsGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();
  const { flyoutState, onFlyoutStateChange, profileId, gridSettings, onMetricExplored } =
    useMetricsExperienceState();

  const gridColumns = columns || 1;
  const gridRows = Math.ceil(metricItems.length / gridColumns);

  const { focusedCell, handleKeyDown, getRowColFromIndex, handleFocusCell, focusCell } =
    useGridNavigation({
      gridColumns,
      gridRows,
      totalRows: metricItems.length,
      gridRef,
    });

  const flyoutData = useMemo(() => {
    if (!flyoutState) {
      return undefined;
    }
    // `metricItems` is already scoped to the current page (see `PAGE_SIZE`), so
    // this lookup is bounded and intentionally not indexed/memoized further.
    const matchedItem = metricItems.find(
      (item) => getMetricUniqueKey(item) === flyoutState.metricUniqueKey
    );
    if (!matchedItem) {
      return undefined;
    }
    return { metricItem: matchedItem, esqlQuery: flyoutState.esqlQuery };
  }, [flyoutState, metricItems]);

  // Discard flyoutState when its metric is filtered out of the grid.
  // `metricItems.length > 0` avoids clearing state on a duplicated tab's first
  // render, where items are momentarily empty before the per-tab fetch resolves.
  useEffect(() => {
    if (flyoutState && metricItems.length > 0 && !flyoutData) {
      onFlyoutStateChange(undefined);
    }
  }, [flyoutState, metricItems.length, flyoutData, onFlyoutStateChange]);

  const handleViewDetails = useCallback(
    (index: number, esqlQuery: string, metricItem: ParsedMetricItem) => {
      onFlyoutStateChange({
        gridPosition: index,
        metricUniqueKey: getMetricUniqueKey(metricItem),
        esqlQuery,
        selectedTabId: 'overview',
      });
    },
    [onFlyoutStateChange]
  );

  const isFlyoutOpen = Boolean(flyoutData) && isTabSelected;

  // Keyed on whether the flyout is open rather than on `flyoutData`, so switching metrics while it
  // is open does not dismiss the other flyouts again. This covers both View details and a tab
  // restoring its `flyoutState` when it becomes active.
  useEffect(() => {
    if (isFlyoutOpen) {
      dismissAllFlyoutsExceptFor(DiscoverFlyouts.metricInsights);
    }
  }, [isFlyoutOpen]);

  const handleCloseFlyout = useCallback(() => {
    if (!flyoutState) {
      return;
    }

    const currentIndex = metricItems.findIndex(
      (item) => getMetricUniqueKey(item) === flyoutState.metricUniqueKey
    );
    onFlyoutStateChange(undefined);

    if (currentIndex === -1) {
      return;
    }

    const { rowIndex, colIndex } = getRowColFromIndex(currentIndex);
    // Use requestAnimationFrame to ensure the flyout is fully closed before focusing
    requestAnimationFrame(() => {
      focusCell(rowIndex, colIndex);
    });
  }, [flyoutState, focusCell, getRowColFromIndex, metricItems, onFlyoutStateChange]);

  if (metricItems.length === 0) {
    return <EmptyState />;
  }

  return (
    <FieldsMetadataProvider fields={metricItems} services={services}>
      <A11yGridWrapper
        ref={gridRef}
        gridRows={gridRows}
        gridColumns={gridColumns}
        onKeyDown={handleKeyDown}
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
          {metricItems.map((metricItem, index) => {
            const id = getItemKey(metricItem, index);
            const { rowIndex, colIndex } = getRowColFromIndex(index);
            const isFocused =
              focusedCell.rowIndex === rowIndex && focusedCell.colIndex === colIndex;
            const isSelected =
              isTabSelected && flyoutState?.metricUniqueKey === getMetricUniqueKey(metricItem);

            return (
              <EuiFlexItem key={id}>
                <ChartItem
                  id={id}
                  index={index}
                  metricItem={metricItem}
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
                  isSelected={isSelected}
                  onFocusCell={handleFocusCell}
                  onViewDetails={handleViewDetails}
                  searchTerm={searchTerm}
                  whereStatements={whereStatements}
                  userSource={userSource}
                  description={getDescription?.(metricItem)}
                  userMessages={getUserMessages ? getUserMessages(metricItem) : undefined}
                  profileId={profileId}
                  gridSettings={gridSettings}
                  onMetricExplored={onMetricExplored}
                  isComponentVisible={isComponentVisible}
                  histogramBounds={histogramBounds}
                  histogramBoundsLoading={histogramBoundsLoading}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </A11yGridWrapper>
      {flyoutData && isFlyoutOpen && (
        <MetricInsightsFlyout
          metricItem={flyoutData.metricItem}
          esqlQuery={flyoutData.esqlQuery}
          onClose={handleCloseFlyout}
        />
      )}
    </FieldsMetadataProvider>
  );
};
