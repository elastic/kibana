/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer } from '@elastic/eui';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import { getFlattenedTraceDocumentOverview } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { SERVICE_NAME, SPAN_ID, TRACE_ID, TRANSACTION_ID } from '@kbn/apm-types';
import { DataSourcesProvider } from '../../traces/hooks/use_data_sources';
import {
  getTabContentAvailableHeight,
  DEFAULT_MARGIN_BOTTOM,
} from '../../../doc_viewer_source/get_height';
import { About } from '../../traces/components/about';
import { TraceRootItemProvider } from '../../traces/doc_viewer_overview/hooks/use_fetch_trace_root_item';
import { TraceWaterfall } from '../../traces/components/trace_waterfall';
import { ErrorsTable } from '../../traces/components/errors';
import { TraceContextLogEvents } from '../../traces/components/trace_context_log_events';
import { isTransaction } from '../../traces/helpers';

export type OverviewProps = DocViewRenderProps & {
  indexes: TraceIndexes;
  showWaterfall?: boolean;
  showActions?: boolean;
};

export function Overview({
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  indexes,
  showWaterfall = true,
  dataView,
  decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
}: OverviewProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const flattenedHit = useMemo(() => getFlattenedTraceDocumentOverview(hit), [hit]);

  const isSpan = !isTransaction(hit);

  const traceId = flattenedHit[TRACE_ID];
  const transactionId = flattenedHit[TRANSACTION_ID];
  const spanId = flattenedHit[SPAN_ID];
  const serviceName = flattenedHit[SERVICE_NAME];
  const docId = isSpan ? spanId : transactionId;

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy)
    : 0;

  return (
    <DataSourcesProvider indexes={indexes}>
      <TraceRootItemProvider traceId={traceId}>
        <div
          ref={setContainerRef}
          css={
            containerHeight
              ? css`
                  max-height: ${containerHeight}px;
                  overflow: auto;
                `
              : undefined
          }
        >
          <EuiSpacer size="m" />
          <About
            hit={hit}
            dataView={dataView}
            filter={filter}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
          />
          <EuiSpacer size="m" />
          {showWaterfall ? (
            <TraceWaterfall
              dataView={dataView}
              traceId={traceId}
              docId={docId}
              serviceName={serviceName}
            />
          ) : null}
          <EuiSpacer size="m" />
          <ErrorsTable traceId={traceId} docId={docId} />
          <EuiSpacer size="m" />
          <TraceContextLogEvents traceId={traceId} spanId={spanId} transactionId={transactionId} />
        </div>
      </TraceRootItemProvider>
    </DataSourcesProvider>
  );
}
