/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import type { estypes } from '@elastic/elasticsearch';
import type { TimeRange } from '@kbn/es-query';
import useDebounce from 'react-use/lib/useDebounce';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import {
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';
import { buildBucketInterval } from './build_bucket_interval';
import { useTimeRange } from './use_time_range';
import { REQUEST_DEBOUNCE_MS } from './consts';

export interface HistogramProps {
  services: UnifiedHistogramServices;
  dataView: DataView;
  lastReloadRequestTime: number | undefined;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart: UnifiedHistogramChartContext;
  timeRange: TimeRange;
  lensAttributes: TypedLensByValueInput['attributes'];
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
}

export function Histogram({
  services: { data, lens, uiSettings },
  dataView,
  lastReloadRequestTime,
  request,
  hits,
  chart: { timeInterval },
  timeRange,
  lensAttributes: attributes,
  onTotalHitsChange,
  onChartLoad,
}: HistogramProps) {
  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange,
    timeInterval,
  });

  // Keep track of previous hits in a ref to avoid recreating the
  // onLoad callback when the hits change, which triggers a Lens reload
  const previousHits = useRef(hits?.total);

  useEffect(() => {
    previousHits.current = hits?.total;
  }, [hits?.total]);

  const onLoad = useCallback(
    (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => {
      const lensRequest = adapters?.requests?.getRequests()[0];
      const requestFailed = lensRequest?.status === RequestStatus.ERROR;
      const json = lensRequest?.response?.json as
        | IKibanaSearchResponse<estypes.SearchResponse>
        | undefined;
      const response = json?.rawResponse;

      // Lens will swallow shard failures and return `isLoading: false` because it displays
      // its own errors, but this causes us to emit onTotalHitsChange(UnifiedHistogramFetchStatus.complete, 0).
      // This is incorrect, so we check for request failures and shard failures here, and emit an error instead.
      if (requestFailed || response?._shards.failed) {
        onTotalHitsChange?.(UnifiedHistogramFetchStatus.error, undefined);
        onChartLoad?.({ complete: false, adapters: adapters ?? {} });
        return;
      }

      const totalHits = adapters?.tables?.tables?.unifiedHistogram?.meta?.statistics?.totalCount;

      onTotalHitsChange?.(
        isLoading ? UnifiedHistogramFetchStatus.loading : UnifiedHistogramFetchStatus.complete,
        totalHits ?? previousHits.current
      );

      if (response) {
        const newBucketInterval = buildBucketInterval({
          data,
          dataView,
          timeInterval,
          timeRange,
          response,
        });

        setBucketInterval(newBucketInterval);
      }

      onChartLoad?.({ complete: !isLoading, adapters: adapters ?? {} });
    },
    [data, dataView, onChartLoad, onTotalHitsChange, timeInterval, timeRange]
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

  const [debouncedProps, setDebouncedProps] = useState(
    getLensProps({
      timeRange,
      attributes,
      request,
      lastReloadRequestTime,
      onLoad,
    })
  );

  useDebounce(
    () => {
      setDebouncedProps(
        getLensProps({ timeRange, attributes, request, lastReloadRequestTime, onLoad })
      );
    },
    REQUEST_DEBOUNCE_MS,
    [attributes, lastReloadRequestTime, onLoad, request, timeRange]
  );

  return (
    <>
      <div data-test-subj="unifiedHistogramChart" data-time-range={timeRangeText} css={chartCss}>
        <lens.EmbeddableComponent {...debouncedProps} />
      </div>
      {timeRangeDisplay}
    </>
  );
}

export const getLensProps = ({
  timeRange,
  attributes,
  request,
  lastReloadRequestTime,
  onLoad,
}: {
  timeRange: TimeRange;
  attributes: TypedLensByValueInput['attributes'];
  request: UnifiedHistogramRequestContext | undefined;
  lastReloadRequestTime: number | undefined;
  onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => ({
  id: 'unifiedHistogramLensComponent',
  viewMode: ViewMode.VIEW,
  timeRange,
  attributes,
  noPadding: true,
  searchSessionId: request?.searchSessionId,
  executionContext: {
    description: 'fetch chart data and total hits',
  },
  lastReloadRequestTime,
  onLoad,
});
