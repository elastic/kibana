/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  HeatmapConfig,
  LensLegendConfig,
  LensSeriesLayer,
  LensYBoundsConfig,
} from '@kbn/lens-embeddable-utils';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback, useRef } from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import { useLensProps } from './hooks/use_lens_props';
import type { LensWrapperProps } from './lens_wrapper';
import { LensWrapper } from './lens_wrapper';
import type { UnifiedMetricsGridProps } from '../../types';

export const ChartSizes = {
  s: 230,
  m: 350,
};

export type ChartSize = keyof typeof ChartSizes;
export type ChartProps = Pick<UnifiedMetricsGridProps, 'fetchParams'> &
  Omit<LensWrapperProps, 'lensProps' | 'abortController'> & {
    size?: ChartSize;
    discoverFetch$: UnifiedMetricsGridProps['fetch$'];
    esqlQuery: string;
    title: string;
    description?: string;
    chartLayers: LensSeriesLayer[];
    yBounds?: LensYBoundsConfig;
    legend?: LensLegendConfig;
    yAxisTitle?: string;
    /** Lens API heatmap. When set, the chart is not an XY series chart. */
    heatmapConfig?: HeatmapConfig;
    /** Shown when a distribution has no finite range, instead of the loading chart. */
    emptyMessage?: string;
    isLoading?: boolean;
    error?: Error;
    userMessages?: EmbeddableComponentProps['userMessages'];
    profileId: string;
    id: string;
    isSelected: boolean;
  };

const LensWrapperMemo = React.memo(LensWrapper);
export const Chart = ({
  services,
  onBrushEnd,
  onFilter,
  onViewDetails,
  onExploreInDiscoverTab,
  fetchParams,
  discoverFetch$,
  titleHighlight,
  size = 'm',
  esqlQuery,
  title,
  description,
  chartLayers,
  syncCursor,
  syncTooltips,
  yBounds,
  legend,
  yAxisTitle,
  heatmapConfig,
  emptyMessage,
  extraDisabledActions,
  quickActionIds,
  isLoading = false,
  error,
  userMessages,
  profileId,
  id,
  isSelected,
}: ChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const [isSaveModalVisible, { toggle: toggleSaveModalVisible }] = useBoolean(false);
  const { SaveModalComponent } = services.lens;

  const lensProps = useLensProps({
    chartId: id,
    title,
    description,
    query: esqlQuery,
    services,
    fetchParams,
    discoverFetch$,
    chartRef,
    chartLayers,
    yBounds,
    legend,
    yAxisTitle,
    heatmapConfig,
    error,
    userMessages,
    profileId,
  });

  const handleFilter = useCallback<NonNullable<ChartProps['onFilter']>>(
    (event) => {
      // A cell click would filter the histogram field by the bucket start, and ES|QL cannot
      // compare a histogram to a number. Brushing still uses onBrushEnd.
      if (heatmapConfig) {
        event.preventDefault();
        return;
      }
      onFilter?.(event);
    },
    [heatmapConfig, onFilter]
  );

  return (
    <div
      css={css`
        height: ${ChartSizes[size]}px;
        outline: ${isSelected
          ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.vis.euiColorVis0}`
          : `${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade}`};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      ref={chartRef}
    >
      {emptyMessage && !isLoading ? (
        <EuiFlexGroup
          css={css`
            height: 100%;
            padding: ${euiTheme.size.m};
          `}
          direction="column"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              style={{ height: '100%' }}
              justifyContent="center"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  textAlign="center"
                  color="subdued"
                  data-test-subj="metricsExperienceHistogramEmpty"
                >
                  <p>{emptyMessage}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : lensProps && !isLoading ? (
        <>
          <LensWrapperMemo
            lensProps={lensProps}
            services={services}
            onBrushEnd={onBrushEnd}
            onFilter={handleFilter}
            abortController={fetchParams.abortController}
            onViewDetails={onViewDetails}
            onCopyToDashboard={toggleSaveModalVisible}
            onExploreInDiscoverTab={onExploreInDiscoverTab}
            syncCursor={syncCursor}
            titleHighlight={titleHighlight}
            syncTooltips={syncTooltips}
            extraDisabledActions={extraDisabledActions}
            quickActionIds={quickActionIds}
          />
          {isSaveModalVisible && (
            <SaveModalComponent
              initialInput={{ attributes: lensProps.attributes }}
              onClose={toggleSaveModalVisible}
              // Disables saving ESQL charts to the library.
              // it will only copy it to a dashboard
              isSaveable={false}
            />
          )}
        </>
      ) : (
        <EuiFlexGroup
          style={{ height: '100%' }}
          justifyContent="center"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};
