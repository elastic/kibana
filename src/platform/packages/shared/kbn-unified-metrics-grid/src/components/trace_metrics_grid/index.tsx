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
import { useFetch } from '@kbn/unified-histogram';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import React, { useMemo } from 'react';
import { Subject } from 'rxjs';
import { Provider } from 'react-redux';
import { ChartSizes } from '../chart';
import { useLensProps } from '../chart/hooks/use_lens_props';
import { LensWrapper } from '../chart/lens_wrapper';
import { store } from '../../store';

const LensWrapperMemo = React.memo(LensWrapper);

function TraceMetricsGrid({
  requestParams,
  services,
  input$: originalInput$,
  searchSessionId,
  onBrushEnd,
  onFilter,
  abortController,
  dataView,
}: ChartSectionProps) {
  const { EmbeddableComponent } = services.lens;
  const { euiTheme } = useEuiTheme();

  const { getTimeRange, updateTimeRange } = requestParams;
  const timeRange = getTimeRange();

  const esql = useMemo(
    () =>
      `FROM traces-* | where processor.event  == "transaction"| EVAL duration_ms = ROUND(transaction.duration.us)/1000 | STATS avg_duration = AVG(duration_ms) BY timestamp = BUCKET(@timestamp, 100, "${timeRange.from}", "${timeRange.to}") | KEEP avg_duration, timestamp | SORT timestamp`,
    [timeRange]
  );

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const discoverFetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
  });

  const lensProps = useLensProps({
    title: 'Trace Metrics Grid',
    query: esql,
    getTimeRange: () => timeRange,
    seriesType: 'line',
    services,
    unit: 'ms',
    discoverFetch$,
    searchSessionId,
  });

  return (
    <Provider store={store}>
      <div
        css={css`
          height: ${ChartSizes}px;
          outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
          border-radius: ${euiTheme.border.radius.medium};
          figcaption {
            display: none;
          }
        `}
      >
        {lensProps && (
          <EmbeddableComponent
            {...lensProps}
            abortController={abortController}
            withDefaultActions
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
          />
        )}
      </div>
    </Provider>
  );
}

// eslint-disable-next-line import/no-default-export
export default TraceMetricsGrid;
