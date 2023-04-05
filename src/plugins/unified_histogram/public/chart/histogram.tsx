/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState, useRef, useEffect } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import type { estypes } from '@elastic/elasticsearch';
import type { TimeRange } from '@kbn/es-query';
import type { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import type { Observable } from 'rxjs';
import {
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
  UnifiedHistogramInputMessage,
} from '../types';
import { buildBucketInterval } from './utils/build_bucket_interval';
import { useTimeRange } from './hooks/use_time_range';
import { useStableCallback } from './hooks/use_stable_callback';
import { useLensProps } from './hooks/use_lens_props';

export interface HistogramProps {
  services: UnifiedHistogramServices;
  dataView: DataView;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart: UnifiedHistogramChartContext;
  isPlainRecord?: boolean;
  getTimeRange: () => TimeRange;
  refetch$: Observable<UnifiedHistogramInputMessage>;
  lensAttributes: TypedLensByValueInput['attributes'];
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
}

export function Histogram({
  services: { data, lens, uiSettings },
  dataView,
  request,
  hits,
  chart: { timeInterval },
  isPlainRecord,
  getTimeRange,
  refetch$,
  lensAttributes: attributes,
  disableTriggers,
  disabledActions,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
}: HistogramProps) {
  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const [chartSize, setChartSize] = useState('100%');
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange: getTimeRange(),
    timeInterval,
    isPlainRecord,
  });
  const chartRef = useRef<HTMLDivElement | null>(null);
  const { height: containerHeight, width: containerWidth } = useResizeObserver(chartRef.current);
  useEffect(() => {
    if (attributes.visualizationType === 'lnsMetric') {
      const size = containerHeight < containerWidth ? containerHeight : containerWidth;
      setChartSize(`${size}px`);
    } else {
      setChartSize('100%');
    }
  }, [attributes, containerHeight, containerWidth]);

  const onLoad = useStableCallback(
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
        onChartLoad?.({ adapters: adapters ?? {} });
        return;
      }

      const adapterTables = adapters?.tables?.tables;
      const totalHits = isPlainRecord
        ? Object.values(adapterTables ?? {})?.[0]?.rows?.length
        : adapterTables?.unifiedHistogram?.meta?.statistics?.totalCount;

      onTotalHitsChange?.(
        isLoading ? UnifiedHistogramFetchStatus.loading : UnifiedHistogramFetchStatus.complete,
        totalHits ?? hits?.total
      );

      if (response) {
        const newBucketInterval = buildBucketInterval({
          data,
          dataView,
          timeInterval,
          timeRange: getTimeRange(),
          response,
        });

        setBucketInterval(newBucketInterval);
      }

      onChartLoad?.({ adapters: adapters ?? {} });
    }
  );

  const lensProps = useLensProps({
    request,
    getTimeRange,
    refetch$,
    attributes,
    onLoad,
  });

  const { euiTheme } = useEuiTheme();
  const chartCss = css`
    position: relative;
    flex-grow: 1;

    & > div {
      height: 100%;
      position: absolute;
      width: 100%;
    }

    & .lnsExpressionRenderer {
      width: ${chartSize};
      margin: auto;
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
      <div
        data-test-subj="unifiedHistogramChart"
        data-time-range={timeRangeText}
        css={chartCss}
        ref={chartRef}
      >
        <lens.EmbeddableComponent
          {...lensProps}
          disableTriggers={disableTriggers}
          disabledActions={disabledActions}
          onFilter={onFilter}
          onBrushEnd={onBrushEnd}
        />
      </div>
      {timeRangeDisplay}
    </>
  );
}
