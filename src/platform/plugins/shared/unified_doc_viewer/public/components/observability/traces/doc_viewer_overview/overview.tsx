/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer } from '@elastic/eui';
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
import { getFlattenedTraceDocumentOverview } from '@kbn/discover-utils';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ScrollableSectionWrapperApi } from '../../../doc_viewer_logs_overview/scrollable_section_wrapper';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../../../doc_viewer_source/get_height';
import { About } from '../components/about';
import { ErrorsTable } from '../components/errors';
import { SimilarSpans } from '../components/similar_spans';
import { SpanLinks } from '../components/span_links';
import { TraceContextLogEvents } from '../components/trace_context_log_events';
import { TraceWaterfall } from '../components/trace_waterfall';
import { isTransaction } from '../helpers';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import { TraceRootItemProvider } from './hooks/use_fetch_trace_root_item';

export type OverviewProps = DocViewRenderProps & {
  indexes: TraceIndexes;
  showWaterfall?: boolean;
  showActions?: boolean;
};

export type TraceOverviewSections = 'errors-table';

export interface OverviewApi {
  openAndScrollToSection: (section: TraceOverviewSections) => void;
}

export const Overview = forwardRef<OverviewApi, OverviewProps>(
  (
    {
      hit,
      filter,
      onAddColumn,
      onRemoveColumn,
      indexes,
      showWaterfall = true,
      dataView,
      decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
    },
    ref
  ) => {
    const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
    const flattenedHit = useMemo(() => getFlattenedTraceDocumentOverview(hit), [hit]);
    const [errorsTableSectionRef, setErrorsTableSectionRef] =
      useState<ScrollableSectionWrapperApi | null>(null);

    const isSpan = !isTransaction(hit);
    const apmDurationField = flattenedHit[TRANSACTION_DURATION] ?? flattenedHit[SPAN_DURATION];
    const isOtelSpan = apmDurationField == null && flattenedHit[DURATION] != null;
    const duration = apmDurationField ?? flattenedHit[DURATION]! * 0.001;

    const traceId = flattenedHit[TRACE_ID];
    const transactionId = flattenedHit[TRANSACTION_ID];
    const spanId = flattenedHit[SPAN_ID];
    const serviceName = flattenedHit[SERVICE_NAME];
    const docId = isSpan ? spanId : transactionId;

    const containerHeight = containerRef
      ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy)
      : 0;

    useImperativeHandle(
      ref,
      () => ({
        openAndScrollToSection: (section) => {
          switch (section) {
            case 'errors-table':
              errorsTableSectionRef?.openAndScrollToSection();
              break;
            default:
              break;
          }
        },
      }),
      [errorsTableSectionRef]
    );

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
            <SimilarSpans
              spanName={flattenedHit[SPAN_NAME]}
              serviceName={serviceName}
              transactionName={flattenedHit[TRANSACTION_NAME]}
              transactionType={flattenedHit[TRANSACTION_TYPE]}
              isOtelSpan={isOtelSpan}
              duration={duration || 0}
            />
            {showWaterfall ? (
              <TraceWaterfall
                dataView={dataView}
                traceId={traceId}
                serviceName={serviceName}
                docId={docId}
              />
            ) : null}
            <EuiSpacer size="m" />
            <ErrorsTable ref={setErrorsTableSectionRef} traceId={traceId} docId={docId} />
            <EuiSpacer size="m" />
            <TraceContextLogEvents
              traceId={traceId}
              spanId={spanId}
              transactionId={transactionId}
            />
            {docId ? (
              <>
                <EuiSpacer size="m" />
                <SpanLinks traceId={traceId} docId={docId} />
              </>
            ) : null}
          </div>
        </TraceRootItemProvider>
      </DataSourcesProvider>
    );
  }
);
