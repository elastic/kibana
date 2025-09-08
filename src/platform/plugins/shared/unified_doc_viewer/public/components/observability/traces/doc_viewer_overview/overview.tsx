/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import { getFlattenedTraceDocumentOverview } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  DURATION,
  SERVICE_NAME,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import { SpanLinks } from '../components/span_links';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import { Trace } from '../components/trace';
import {
  getTabContentAvailableHeight,
  DEFAULT_MARGIN_BOTTOM,
} from '../../../doc_viewer_source/get_height';
import { About } from '../components/about';
import { TraceContextLogEvents } from '../components/trace_context_log_events';
import { SimilarSpans } from '../components/similar_spans';
import { isTransaction } from '../helpers';
import { TraceRootItemProvider } from './hooks/use_fetch_trace_root_item';

export type OverviewProps = DocViewRenderProps & {
  indexes: TraceIndexes;
  showWaterfall?: boolean;
  showActions?: boolean;
};

export function Overview({
  columns,
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
  const apmDurationField = flattenedHit[TRANSACTION_DURATION] ?? flattenedHit[SPAN_DURATION];
  const isOtelSpan = apmDurationField == null && flattenedHit[DURATION] != null;
  const duration = isOtelSpan ? flattenedHit[DURATION]! * 0.001 : apmDurationField;

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
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
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
          <EuiFlexItem>
            <EuiSpacer size="m" />
            <About
              hit={hit}
              dataView={dataView}
              filter={filter}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiSpacer size="m" />
            <SimilarSpans
              spanName={flattenedHit[SPAN_NAME]}
              serviceName={serviceName}
              transactionName={flattenedHit[TRANSACTION_NAME]}
              transactionType={flattenedHit[TRANSACTION_TYPE]}
              isOtelSpan={isOtelSpan}
              duration={duration || 0}
            />
          </EuiFlexItem>

          {showWaterfall && docId ? (
            <EuiFlexItem>
              <EuiSpacer size="m" />
              <Trace
                dataView={dataView}
                traceId={traceId}
                serviceName={serviceName || ''}
                docId={docId}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiSpacer size="m" />
            <SpanLinks traceId={traceId} docId={docId || ''} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer size="m" />
            <TraceContextLogEvents
              traceId={traceId}
              spanId={spanId}
              transactionId={transactionId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </TraceRootItemProvider>
    </DataSourcesProvider>
  );
}
