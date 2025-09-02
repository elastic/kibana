/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import {
  SERVICE_NAME_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
  TRANSACTION_TYPE_FIELD,
  getTransactionDocumentOverview,
  TRANSACTION_ID_FIELD,
} from '@kbn/discover-utils';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import { getFlattenedTransactionDocumentOverview } from '@kbn/discover-utils/src';
import { css } from '@emotion/react';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { TransactionDurationSummary } from './sub_components/transaction_duration_summary';
import { RootTransactionProvider } from './hooks/use_root_transaction';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import { Trace } from '../components/trace';

import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../../../doc_viewer_source/get_height';
import { TraceContextLogEvents } from '../components/trace_context_log_events';
import { SpanLinks } from '../components/span_links';
import { About } from '../components/about';

export type TransactionOverviewProps = DocViewRenderProps & {
  indexes: TraceIndexes;
  showWaterfall?: boolean;
  showActions?: boolean;
};

export function TransactionOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  indexes,
  showWaterfall = true,
  dataView,
  decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
}: TransactionOverviewProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { fieldFormats } = getUnifiedDocViewerServices();
  const { formattedDoc, flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getTransactionDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedTransactionDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );

  const transactionDuration = flattenedDoc[TRANSACTION_DURATION_FIELD];

  const traceId = flattenedDoc[TRACE_ID_FIELD];
  const transactionId = flattenedDoc[TRANSACTION_ID_FIELD];

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy)
    : 0;

  return (
    <DataSourcesProvider indexes={indexes}>
      <RootTransactionProvider traceId={traceId}>
        <FieldActionsProvider
          columns={columns}
          filter={filter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
        >
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
            {transactionDuration !== undefined && (
              <EuiFlexItem>
                <TransactionDurationSummary
                  transactionDuration={transactionDuration}
                  transactionName={formattedDoc[TRANSACTION_NAME_FIELD]}
                  transactionType={formattedDoc[TRANSACTION_TYPE_FIELD]}
                  serviceName={formattedDoc[SERVICE_NAME_FIELD]}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              {traceId && transactionId && (
                <>
                  <EuiSpacer size="m" />
                  <Trace
                    hit={hit}
                    showWaterfall={showWaterfall}
                    dataView={dataView}
                    filter={filter}
                    onAddColumn={onAddColumn}
                    onRemoveColumn={onRemoveColumn}
                  />
                </>
              )}
            </EuiFlexItem>
            <EuiSpacer size="m" />
            <SpanLinks
              traceId={traceId}
              docId={transactionId}
              processorEvent={ProcessorEvent.transaction}
            />
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer size="m" />
              <TraceContextLogEvents traceId={traceId} transactionId={transactionId} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FieldActionsProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
