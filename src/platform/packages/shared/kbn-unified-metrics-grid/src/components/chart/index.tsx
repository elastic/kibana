/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { Observable } from 'rxjs';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { useBoolean } from '@kbn/react-hooks';
import { createESQLQuery } from '../../common/utils/esql/create_esql_query';
import type { LensWrapperProps } from './lens_wrapper';
import { LensWrapper } from './lens_wrapper';
import { useLensProps } from './hooks/use_lens_props';

const ChartSizes = {
  s: 230,
  m: 350,
};

export type ChartSize = keyof typeof ChartSizes;
export type ChartProps = Pick<ChartSectionProps, 'searchSessionId' | 'requestParams'> &
  Omit<LensWrapperProps, 'lensProps' | 'onViewDetails' | 'onCopyToDashboard' | 'description'> & {
    dimensions: string[];
    color?: string;
    size?: ChartSize;
    filters?: Array<{ field: string; value: string }>;
    discoverFetch$: Observable<UnifiedHistogramInputMessage>;
    metric: MetricField;
    onViewDetails: (esqlQuery: string, metric: MetricField) => void;
  };

const LensWrapperMemo = React.memo(LensWrapper);
export const Chart = ({
  abortController,
  metric,
  color,
  services,
  searchSessionId,
  onBrushEnd,
  onFilter,
  onViewDetails,
  requestParams,
  discoverFetch$,
  dimensions = [],
  size = 'm',
  filters = [],
}: ChartProps) => {
  const { euiTheme } = useEuiTheme();
  const chartRef = useRef<HTMLDivElement>(null);

  const [isSaveModalVisible, { toggle: toggleSaveModalVisible }] = useBoolean(false);
  const { SaveModalComponent } = services.lens;

  const { getTimeRange } = requestParams;

  const esqlQuery = useMemo(() => {
    const isSupported = metric.type !== 'unsigned_long' && metric.type !== 'histogram';
    if (!isSupported) {
      return '';
    }
    return createESQLQuery({
      metricField: metric.name,
      instrument: metric.instrument,
      index: metric.index,
      dimensions,
      filters,
    });
  }, [metric.type, metric.name, metric.instrument, metric.index, dimensions, filters]);

  const lensProps = useLensProps({
    title: metric.name,
    query: esqlQuery,
    unit: metric.unit,
    seriesType: dimensions.length > 0 ? 'line' : 'area',
    color,
    services,
    searchSessionId,
    discoverFetch$,
    abortController,
    getTimeRange,
    chartRef,
  });

  const handleViewDetails = useCallback(() => {
    onViewDetails(esqlQuery, metric);
  }, [onViewDetails, esqlQuery, metric]);

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
            onViewDetails={handleViewDetails}
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
