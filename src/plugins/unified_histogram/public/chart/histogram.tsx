/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DefaultInspectorAdapters, Datatable } from '@kbn/expressions-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import type { TimeRange } from '@kbn/es-query';
import type { EmbeddableComponentProps, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import type { Observable } from 'rxjs';
import { PublishingSubject } from '@kbn/presentation-publishing';
import {
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
  UnifiedHistogramInputMessage,
  UnifiedHistogramVisContext,
} from '../types';
import { buildBucketInterval } from './utils/build_bucket_interval';
import { useTimeRange } from './hooks/use_time_range';
import { useStableCallback } from '../hooks/use_stable_callback';
import { useLensProps } from './hooks/use_lens_props';

export interface HistogramProps {
  abortController?: AbortController;
  services: UnifiedHistogramServices;
  dataView: DataView;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart: UnifiedHistogramChartContext;
  isPlainRecord?: boolean;
  hasLensSuggestions: boolean;
  getTimeRange: () => TimeRange;
  refetch$: Observable<UnifiedHistogramInputMessage>;
  visContext: UnifiedHistogramVisContext;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  withDefaultActions: EmbeddableComponentProps['withDefaultActions'];
}

const computeTotalHits = (
  hasLensSuggestions: boolean,
  adapterTables:
    | {
        [key: string]: Datatable;
      }
    | undefined,
  isPlainRecord?: boolean
) => {
  if (isPlainRecord && hasLensSuggestions) {
    return Object.values(adapterTables ?? {})?.[0]?.rows?.length;
  } else if (isPlainRecord && !hasLensSuggestions) {
    // ES|QL histogram case
    const rows = Object.values(adapterTables ?? {})?.[0]?.rows;
    if (!rows) {
      return undefined;
    }
    let rowsCount = 0;
    rows.forEach((r) => {
      rowsCount += r.results;
    });
    return rowsCount;
  } else {
    return adapterTables?.unifiedHistogram?.meta?.statistics?.totalCount;
  }
};

export function Histogram({
  services: { data, lens, uiSettings },
  dataView,
  request,
  hits,
  chart: { timeInterval },
  isPlainRecord,
  hasLensSuggestions,
  getTimeRange,
  refetch$,
  visContext,
  disableTriggers,
  disabledActions,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
  withDefaultActions,
  abortController,
}: HistogramProps) {
  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange: getTimeRange(),
    timeInterval,
    isPlainRecord,
    timeField: dataView.timeFieldName,
  });
  const { attributes } = visContext;

  const onLoad = useStableCallback(
    (
      isLoading: boolean,
      adapters: Partial<DefaultInspectorAdapters> | undefined,
      dataLoading$?: PublishingSubject<boolean | undefined>
    ) => {
      const lensRequest = adapters?.requests?.getRequests()[0];
      const requestFailed = lensRequest?.status === RequestStatus.ERROR;
      const json = lensRequest?.response?.json as
        | IKibanaSearchResponse<estypes.SearchResponse>
        | undefined;
      const response = json?.rawResponse;

      console.log('Response', JSON.stringify(response, null, 2));

      if (requestFailed) {
        onTotalHitsChange?.(UnifiedHistogramFetchStatus.error, undefined);
        onChartLoad?.({ adapters: adapters ?? {} });
        return;
      }

      const adapterTables = adapters?.tables?.tables;
      const totalHits = computeTotalHits(hasLensSuggestions, adapterTables, isPlainRecord);

      if (response?._shards?.failed || response?.timed_out) {
        onTotalHitsChange?.(UnifiedHistogramFetchStatus.error, totalHits);
      } else {
        onTotalHitsChange?.(
          isLoading ? UnifiedHistogramFetchStatus.loading : UnifiedHistogramFetchStatus.complete,
          totalHits ?? hits?.total
        );
      }

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

      onChartLoad?.({ adapters: adapters ?? {}, dataLoading$ });
    }
  );

  const { lensProps, requestData } = useLensProps({
    request,
    getTimeRange,
    refetch$,
    visContext,
    onLoad,
  });

  const { euiTheme } = useEuiTheme();
  const boxShadow = `0 2px 2px -1px ${euiTheme.colors.mediumShade},
  0 1px 5px -2px ${euiTheme.colors.mediumShade}`;
  const chartCss = css`
    position: relative;
    flex-grow: 1;
    margin-block: ${euiTheme.size.xs};

    & > div {
      height: 100%;
      position: absolute;
      width: 100%;
    }

    & .lnsExpressionRenderer {
      width: ${attributes.visualizationType === 'lnsMetric' ? '90%' : '100%'};
      margin: auto;
      box-shadow: ${attributes.visualizationType === 'lnsMetric' ? boxShadow : 'none'};
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
        data-request-data={requestData}
        data-suggestion-type={visContext.suggestionType}
        css={chartCss}
      >
        <lens.EmbeddableComponent
          {...lensProps}
          abortController={abortController}
          disableTriggers={disableTriggers}
          disabledActions={disabledActions}
          onFilter={onFilter}
          onBrushEnd={onBrushEnd}
          withDefaultActions={withDefaultActions}
        />
      </div>
      {timeRangeDisplay}
    </>
  );
}
