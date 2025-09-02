/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import {
  OTEL_DURATION,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_ID_FIELD,
  SPAN_NAME_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
  getSpanDocumentOverview,
} from '@kbn/discover-utils';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import { getFlattenedSpanDocumentOverview } from '@kbn/discover-utils/src';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { SpanLinks } from '../components/span_links';
import { RootTransactionProvider } from '../doc_viewer_transaction_overview/hooks/use_root_transaction';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import { RootSpanProvider } from './hooks/use_root_span';
import { SpanDurationSummary } from './sub_components/span_duration_summary';
import {
  getTabContentAvailableHeight,
  DEFAULT_MARGIN_BOTTOM,
} from '../../../doc_viewer_source/get_height';
import { Trace } from '../components/trace';
import { About } from '../components/about';
import { TraceContextLogEvents } from '../components/trace_context_log_events';

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
  const { fieldFormats } = getUnifiedDocViewerServices();
  const { flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getSpanDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedSpanDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );

  const isOtelSpan =
    flattenedDoc[SPAN_DURATION_FIELD] == null && flattenedDoc[OTEL_DURATION] != null;

  const spanDuration = isOtelSpan
    ? flattenedDoc[OTEL_DURATION]! * 0.001
    : flattenedDoc[SPAN_DURATION_FIELD];

  const traceId = flattenedDoc[TRACE_ID_FIELD];
  const transactionId = flattenedDoc[TRANSACTION_ID_FIELD];
  const spanId = flattenedDoc[SPAN_ID_FIELD];

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
                displayType="span" // TODO I think it should be the section itself who decides the "displayType" as it has access to the whole hit
                dataView={dataView}
                filter={filter}
                onAddColumn={onAddColumn}
                onRemoveColumn={onRemoveColumn}
              />
            </EuiFlexItem>

            {spanDuration && ( // TODO change with new section for Similar spans / Latency (still to be created)
              <EuiFlexItem>
                <EuiSpacer size="m" />
                <SpanDurationSummary
                  spanDuration={spanDuration}
                  spanName={flattenedDoc[SPAN_NAME_FIELD]}
                  serviceName={flattenedDoc[SERVICE_NAME_FIELD]}
                  isOtelSpan={isOtelSpan}
                />
              </EuiFlexItem>
            )}
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
              <SpanLinks traceId={traceId} docId={spanId} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSpacer size="m" />
              <TraceContextLogEvents
                traceId={flattenedDoc[TRACE_ID_FIELD]}
                spanId={flattenedDoc[SPAN_ID_FIELD]}
                transactionId={transactionId}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </RootSpanProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
