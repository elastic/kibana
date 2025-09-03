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
import { getFlattenedTraceDocumentOverview } from '@kbn/discover-utils/src';
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
import { RootTransactionProvider } from '../doc_viewer_transaction_overview/hooks/use_root_transaction';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import { RootSpanProvider } from './hooks/use_root_span';
import {
  getTabContentAvailableHeight,
  DEFAULT_MARGIN_BOTTOM,
} from '../../../doc_viewer_source/get_height';
import { About } from '../components/about';
import { TraceContextLogEvents } from '../components/trace_context_log_events';
import { Trace } from '../components/trace';
import { SimilarSpans } from '../components/similar_spans';
import { isTransaction } from '../helpers';

export type SpanOverviewProps = DocViewRenderProps & {
  indexes: TraceIndexes;
  showWaterfall?: boolean;
  showActions?: boolean;
};

export function SpanOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  indexes,
  showWaterfall = true,
  dataView,
  decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
}: SpanOverviewProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const flattenedHit = useMemo(() => getFlattenedTraceDocumentOverview(hit), [hit]);

  // This logic is meant to be used for both spans and transactions and be
  // adapted once the Unify Span/Transaction into single Overview tab PR
  //  is merged https://github.com/elastic/kibana/pull/233716

  const isSpan = !isTransaction(hit);

  const traceId = flattenedHit[TRACE_ID];
  const transactionId = flattenedHit[TRANSACTION_ID];
  const spanId = flattenedHit[SPAN_ID];
  const docId = isSpan ? spanId : transactionId;

  const duration = isSpan
    ? flattenedHit[SPAN_DURATION] || flattenedHit[SPAN_DURATION]
    : flattenedHit[TRANSACTION_DURATION]; // TODO improve with the OTel compat once we merge https://github.com/elastic/kibana/pull/233716

  const isOtelSpan = flattenedHit[SPAN_DURATION] == null && flattenedHit[DURATION] != null;

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy)
    : 0;

  return (
    <DataSourcesProvider indexes={indexes}>
      <RootTransactionProvider traceId={traceId}>
        <RootSpanProvider traceId={traceId} transactionId={transactionId}>
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
                serviceName={flattenedHit[SERVICE_NAME]}
                transactionName={flattenedHit[TRANSACTION_NAME]}
                transactionType={flattenedHit[TRANSACTION_TYPE]}
                isOtelSpan={isOtelSpan}
                duration={duration || 0}
              />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiSpacer size="m" />
              <Trace
                hit={hit}
                showWaterfall={showWaterfall}
                dataView={dataView}
                filter={filter}
                onAddColumn={onAddColumn}
                onRemoveColumn={onRemoveColumn}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSpacer size="m" />
              {/* // I realized that if the section does not load (when no results) we still keep the spacer*/}
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
        </RootSpanProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
