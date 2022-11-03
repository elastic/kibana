/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import type { estypes } from '@elastic/elasticsearch';
import type { AggregateQuery, Query, Filter, TimeRange } from '@kbn/es-query';
import type {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';
import { getLensAttributes } from './get_lens_attributes';
import { buildBucketInterval } from './build_bucket_interval';
import { useTimeRange } from './use_time_range';

export interface HistogramProps {
  services: UnifiedHistogramServices;
  dataView: DataView;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart: UnifiedHistogramChartContext;
  breakdown?: UnifiedHistogramBreakdownContext;
  filters: Filter[];
  query: Query | AggregateQuery;
  timeRange: TimeRange;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, totalHits?: number) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
}

export function Histogram({
  services: { data, lens, uiSettings },
  dataView,
  request,
  hits,
  chart: { timeInterval },
  breakdown: { field: breakdownField } = {},
  filters,
  query,
  timeRange,
  onTotalHitsChange,
  onChartLoad,
}: HistogramProps) {
  const attributes = useMemo(
    () => getLensAttributes({ filters, query, dataView, timeInterval, breakdownField }),
    [breakdownField, dataView, filters, query, timeInterval]
  );
  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange,
    timeInterval,
  });

  const onLoad = useCallback(
    (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => {
      const totalHits = adapters?.tables?.tables?.unifiedHistogram?.meta?.statistics?.totalCount;

      onTotalHitsChange?.(isLoading ? 'loading' : 'complete', totalHits ?? hits?.total);

      const lensRequest = adapters?.requests?.getRequests()[0];
      const json = lensRequest?.response?.json as IKibanaSearchResponse<estypes.SearchResponse>;
      const response = json?.rawResponse;

      if (response) {
        const newBucketInterval = buildBucketInterval({
          data,
          dataView,
          timeInterval,
          response,
        });

        setBucketInterval(newBucketInterval);
      }

      onChartLoad?.({ complete: !isLoading, adapters: adapters ?? {} });
    },
    [data, dataView, hits?.total, onChartLoad, onTotalHitsChange, timeInterval]
  );

  const { euiTheme } = useEuiTheme();
  const chartCss = css`
    position: relative;
    flex-grow: 1;

    & > div {
      height: 100%;
    }

    & .echLegend .echLegendList {
      padding-right: ${euiTheme.size.s};
    }

    & > .euiLoadingChart {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  `;

  return (
    <>
      <div data-test-subj="unifiedHistogramChart" data-time-range={timeRangeText} css={chartCss}>
        <lens.EmbeddableComponent
          id="unifiedHistogramLensComponent"
          viewMode={ViewMode.VIEW}
          timeRange={timeRange}
          attributes={attributes}
          noPadding
          searchSessionId={request?.searchSessionId}
          executionContext={{
            description: 'fetch chart data and total hits',
          }}
          lastReloadRequestTime={request?.lastReloadRequestTime}
          onLoad={onLoad}
        />
      </div>
      {timeRangeDisplay}
    </>
  );
}
