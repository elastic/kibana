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
import React, { useEffect, useRef } from 'react';
import type { DataSource } from '@kbn/data-source';
import type { EmbeddableComponentProps, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type {
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramServices,
  UnifiedHistogramVisContext,
} from '../../types';
import { useTimeRange } from './hooks/use_time_range';
import type { LensProps } from './hooks/use_lens_props';

export interface HistogramProps {
  abortController: AbortController | undefined;
  services: UnifiedHistogramServices;
  dataSource: DataSource;
  chart: UnifiedHistogramChartContext;
  bucketInterval: UnifiedHistogramBucketInterval | undefined;
  isPlainRecord: boolean;
  requestData: string;
  lensProps: LensProps;
  visContext: UnifiedHistogramVisContext;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];
  onApiAvailable?: EmbeddableComponentProps['onApiAvailable'];
}

/**
 * ES|QL Lens executions must not share Discover's document abort controller: `cancel(REPLACED)`
 * on a document refetch would leave the chart on "The expression was aborted". Abort only when
 * this histogram starts a new fetch (search session / reload).
 */
const useLensAbortController = ({
  isPlainRecord,
  parentAbortController,
  searchSessionId,
  lastReloadRequestTime,
}: {
  isPlainRecord: boolean;
  parentAbortController: AbortController | undefined;
  searchSessionId: string | undefined;
  lastReloadRequestTime: number | undefined;
}): AbortController | undefined => {
  const esqlAbortRef = useRef<AbortController>(new AbortController());
  const fetchKey = `${searchSessionId ?? ''}:${lastReloadRequestTime ?? ''}`;
  const prevFetchKeyRef = useRef(fetchKey);

  if (isPlainRecord && prevFetchKeyRef.current !== fetchKey) {
    esqlAbortRef.current.abort();
    esqlAbortRef.current = new AbortController();
    prevFetchKeyRef.current = fetchKey;
  }

  useEffect(() => {
    return () => {
      esqlAbortRef.current.abort();
    };
  }, []);

  return isPlainRecord ? esqlAbortRef.current : parentAbortController;
};

export function Histogram({
  services: { lens, uiSettings },
  dataSource,
  chart: { timeInterval },
  bucketInterval,
  isPlainRecord,
  requestData,
  lensProps,
  visContext,
  disableTriggers,
  disabledActions,
  onFilter,
  onBrushEnd,
  withDefaultActions,
  onApiAvailable,
  abortController,
}: HistogramProps) {
  const lensAbortController = useLensAbortController({
    isPlainRecord,
    parentAbortController: abortController,
    searchSessionId: lensProps.searchSessionId,
    lastReloadRequestTime: lensProps.lastReloadRequestTime,
  });
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange: lensProps.timeRange!,
    timeInterval,
    isPlainRecord,
    timeField: dataSource.timeFieldName,
  });
  const { attributes } = visContext;
  const { euiTheme } = useEuiTheme();

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
      border: ${attributes.visualizationType === 'lnsMetric'
        ? `1px solid ${euiTheme.colors.borderBaseSubdued}`
        : 'none'};
      border-radius: ${attributes.visualizationType === 'lnsMetric'
        ? euiTheme.border.radius.medium
        : '0'};
    }

    & .echLegend .echLegendGridList {
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
          // forceDSL is set to true to ensure that the Lens always uses DSL to fetch the data
          // as some consumers (discover) rely on the total hits count which is not provided by ESQL
          forceDSL={true}
          abortController={lensAbortController}
          disableTriggers={disableTriggers}
          disabledActions={disabledActions}
          onFilter={onFilter}
          onBrushEnd={onBrushEnd}
          withDefaultActions={withDefaultActions}
          onApiAvailable={onApiAvailable}
        />
      </div>
      {timeRangeDisplay}
    </>
  );
}
