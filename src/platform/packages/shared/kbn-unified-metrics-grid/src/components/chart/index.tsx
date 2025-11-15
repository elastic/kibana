/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { useBoolean } from '@kbn/react-hooks';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import React, { useRef } from 'react';
import type { LensYBoundsConfig } from '@kbn/lens-embeddable-utils/config_builder/types';
import { useLensProps } from './hooks/use_lens_props';
import type { LensWrapperProps } from './lens_wrapper';
import { LensWrapper } from './lens_wrapper';

export const ChartSizes = {
  s: 230,
  m: 350,
};

export type ChartSize = keyof typeof ChartSizes;
export type ChartProps = Pick<ChartSectionProps, 'fetchParams'> &
  Omit<
    LensWrapperProps,
    'lensProps' | 'onViewDetails' | 'onCopyToDashboard' | 'description' | 'abortController'
  > & {
    size?: ChartSize;
    discoverFetch$: ChartSectionProps['fetch$'];
    onViewDetails?: () => void;
    esqlQuery: string;
    title: string;
    chartLayers: LensSeriesLayer[];
    yBounds?: LensYBoundsConfig;
  };

const LensWrapperMemo = React.memo(LensWrapper);
export const Chart = ({
  services,
  onBrushEnd,
  onFilter,
  onViewDetails,
  fetchParams,
  discoverFetch$,
  titleHighlight,
  size = 'm',
  esqlQuery,
  title,
  chartLayers,
  syncCursor,
  syncTooltips,
  yBounds,
}: ChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const [isSaveModalVisible, { toggle: toggleSaveModalVisible }] = useBoolean(false);
  const { SaveModalComponent } = services.lens;

  const lensProps = useLensProps({
    title,
    query: esqlQuery,
    services,
    fetchParams,
    discoverFetch$,
    chartRef,
    chartLayers,
    yBounds,
  });

  return (
    <div
      css={css`
        height: ${ChartSizes[size]}px;
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};

        &:hover {
          .metricsExperienceChartTitle {
            z-index: ${Number(euiTheme.levels.menu) + 1};
            transition: none;
          }
        }
      `}
      ref={chartRef}
    >
      {lensProps ? (
        <>
          <LensWrapperMemo
            lensProps={lensProps}
            services={services}
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
            abortController={fetchParams.abortController}
            onViewDetails={onViewDetails}
            onCopyToDashboard={toggleSaveModalVisible}
            syncCursor={syncCursor}
            titleHighlight={titleHighlight}
            syncTooltips={syncTooltips}
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
