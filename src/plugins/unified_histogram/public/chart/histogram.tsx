/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { connectToQueryState, IKibanaSearchResponse, QueryState } from '@kbn/data-plugin/public';
import type { estypes } from '@elastic/elasticsearch';
import { createStateContainer, useContainerState } from '@kbn/kibana-utils-plugin/public';
import type {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramServices,
} from '../types';
import { getLensAttributes } from './get_lens_attributes';
import { buildBucketInterval } from './build_bucket_interval';
import { useTimeRange } from './use_time_range';

export interface HistogramProps {
  services: UnifiedHistogramServices;
  dataView: DataView;
  chart: UnifiedHistogramChartContext;
  breakdown?: UnifiedHistogramBreakdownContext;
  onTotalHitsChange: (totalHits: number) => void;
}

export function Histogram({
  services: { data, lens, uiSettings },
  dataView,
  chart: { timeInterval },
  breakdown: { field: breakdownField } = {},
  onTotalHitsChange,
}: HistogramProps) {
  const queryStateContainer = useMemo(() => {
    return createStateContainer<QueryState>({
      filters: data.query.filterManager.getFilters(),
      query: data.query.queryString.getQuery(),
      refreshInterval: data.query.timefilter.timefilter.getRefreshInterval(),
      time: data.query.timefilter.timefilter.getTime(),
    });
  }, [data.query.filterManager, data.query.queryString, data.query.timefilter.timefilter]);

  const queryState = useContainerState(queryStateContainer);

  useEffect(() => {
    return connectToQueryState(data.query, queryStateContainer, {
      time: true,
      query: true,
      filters: true,
      refreshInterval: true,
    });
  }, [data.query, queryStateContainer]);

  const filters = useMemo(() => queryState.filters ?? [], [queryState.filters]);
  const query = useMemo(
    () => queryState.query ?? data.query.queryString.getDefaultQuery(),
    [data.query.queryString, queryState.query]
  );
  const attributes = useMemo(
    () => getLensAttributes({ filters, query, dataView, timeInterval, breakdownField }),
    [breakdownField, dataView, filters, query, timeInterval]
  );
  const timeRange = data.query.timefilter.timefilter.getAbsoluteTime();
  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange,
    timeInterval,
  });

  const onLoad = useCallback(
    (_, adapters: Partial<DefaultInspectorAdapters> | undefined) => {
      const totalHits = adapters?.tables?.tables?.unifiedHistogram?.meta?.statistics?.totalCount;

      if (totalHits) {
        onTotalHitsChange(totalHits);
      }

      const request = adapters?.requests?.getRequests()[0];
      const json = request?.response?.json as IKibanaSearchResponse<estypes.SearchResponse>;
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
    },
    [data, dataView, onTotalHitsChange, timeInterval]
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
          onLoad={onLoad}
        />
      </div>
      {timeRangeDisplay}
    </>
  );
}
