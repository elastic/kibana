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
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
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
  abortController?: AbortController;
  services: UnifiedHistogramServices;
  dataView: DataView;
  chart: UnifiedHistogramChartContext;
  bucketInterval?: UnifiedHistogramBucketInterval;
  isPlainRecord?: boolean;
  getTimeRange: () => TimeRange;
  requestData: string;
  lensProps: LensProps;
  visContext: UnifiedHistogramVisContext;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];
}

export function Histogram({
  services: { lens, uiSettings },
  dataView,
  chart: { timeInterval },
  bucketInterval,
  isPlainRecord,
  getTimeRange,
  requestData,
  lensProps,
  visContext,
  disableTriggers,
  disabledActions,
  onFilter,
  onBrushEnd,
  withDefaultActions,
  abortController,
}: HistogramProps) {
  const { timeRangeText, timeRangeDisplay } = useTimeRange({
    uiSettings,
    bucketInterval,
    timeRange: getTimeRange(),
    timeInterval,
    isPlainRecord,
    timeField: dataView.timeFieldName,
  });
  const { attributes } = visContext;
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
          // forceDSL is set to true to ensure that the Lens always uses DSL to fetch the data
          // as some consumers (discover) rely on the total hits count which is not provided by ESQL
          forceDSL={true}
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
