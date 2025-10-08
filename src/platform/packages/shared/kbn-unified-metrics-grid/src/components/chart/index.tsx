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
import type { MetricUnit } from '@kbn/metrics-experience-plugin/common/types';
import { useBoolean } from '@kbn/react-hooks';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import React, { useRef } from 'react';
import type { Observable } from 'rxjs';
import { useLensProps } from './hooks/use_lens_props';
import type { LensWrapperProps } from './lens_wrapper';
import { LensWrapper } from './lens_wrapper';
<<<<<<< HEAD
=======
import { useChartLayers } from './hooks/use_chart_layers';
import { useLensProps } from './hooks/use_lens_props';
>>>>>>> c809a954c20b6ab39780a65056b7a8c8ed7b6f16

export const ChartSizes = {
  s: 230,
  m: 350,
};

export type ChartSize = keyof typeof ChartSizes;
export type ChartProps = Pick<ChartSectionProps, 'searchSessionId' | 'requestParams'> &
  Omit<LensWrapperProps, 'lensProps' | 'onViewDetails' | 'onCopyToDashboard' | 'description'> & {
    color?: string;
    size?: ChartSize;
    discoverFetch$: Observable<UnifiedHistogramInputMessage>;
    onViewDetails?: () => void;
    esqlQuery: string;
    title: string;
    unit?: MetricUnit;
    seriesType: LensSeriesLayer['seriesType'];
  };

const LensWrapperMemo = React.memo(LensWrapper);
export const Chart = ({
  abortController,
  color,
  services,
  searchSessionId,
  onBrushEnd,
  onFilter,
  onViewDetails,
  requestParams,
  discoverFetch$,
  size = 'm',
  esqlQuery,
  title,
  unit,
  seriesType,
}: ChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const [isSaveModalVisible, { toggle: toggleSaveModalVisible }] = useBoolean(false);
  const { SaveModalComponent } = services.lens;
  const { getTimeRange } = requestParams;

  const lensProps = useLensProps({
    title,
    query: esqlQuery,
    unit,
    seriesType,
    color,
    services,
    searchSessionId,
    discoverFetch$,
    getTimeRange,
    chartRef,
    chartLayers: [],
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
            abortController={abortController}
            onViewDetails={onViewDetails}
            onCopyToDashboard={toggleSaveModalVisible}
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
