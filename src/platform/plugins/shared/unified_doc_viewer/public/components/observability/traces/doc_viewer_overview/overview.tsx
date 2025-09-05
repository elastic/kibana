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
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_ID_FIELD,
  getTraceDocumentOverview,
  getFlattenedTraceDocumentOverview,
  TRANSACTION_NAME_FIELD,
  TRANSACTION_TYPE_FIELD,
} from '@kbn/discover-utils';
import type { TraceIndexes } from '@kbn/discover-utils/src';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useDataViewFields } from '../../../../hooks/use_data_view_fields';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { SpanLinks } from '../components/span_links';
import { Trace } from '../components/trace';
import { RootSpanProvider } from './hooks/use_root_span';
import { spanAndTransactionFields, traceFields } from './resources/fields';
import { getFieldConfiguration } from './resources/get_field_configuration';
import { DurationSummary } from './sub_components/duration_summary';
import { SummaryField } from './sub_components/summary_field';
import { SummaryTitle } from './sub_components/summary_title';
import { RootTransactionProvider } from './hooks/use_root_transaction';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import {
  getTabContentAvailableHeight,
  DEFAULT_MARGIN_BOTTOM,
} from '../../../doc_viewer_source/get_height';
import { TraceContextLogEvents } from '../components/trace_context_log_events';

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
  showActions = true,
  dataView,
  columnsMeta,
  decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
}: OverviewProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { fieldFormats } = getUnifiedDocViewerServices();
  const { formattedDoc, flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getTraceDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedTraceDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );
  const { dataViewFields } = useDataViewFields({ fields: traceFields, dataView, columnsMeta });
  const fieldConfigurations = useMemo(
    () => getFieldConfiguration({ attributes: formattedDoc, flattenedDoc }),
    [formattedDoc, flattenedDoc]
  );

  const id = flattenedDoc[TRANSACTION_ID_FIELD] || flattenedDoc[SPAN_ID_FIELD]!;
  const formattedId = formattedDoc[TRANSACTION_ID_FIELD] || formattedDoc[SPAN_ID_FIELD];
  const formattedName = formattedDoc[TRANSACTION_NAME_FIELD] || formattedDoc[SPAN_NAME_FIELD];

  const displayType = formattedDoc[TRANSACTION_NAME_FIELD]
    ? ProcessorEvent.transaction
    : ProcessorEvent.span;

  const apmDurationField =
    flattenedDoc[TRANSACTION_DURATION_FIELD] ?? flattenedDoc[SPAN_DURATION_FIELD];

  const isOtelSpan = apmDurationField == null && flattenedDoc[OTEL_DURATION] != null;

  const duration = isOtelSpan ? flattenedDoc[OTEL_DURATION]! * 0.001 : apmDurationField;

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
                <SummaryTitle
                  spanName={flattenedDoc[SPAN_NAME_FIELD]}
                  transactionName={flattenedDoc[TRANSACTION_NAME_FIELD]}
                  serviceName={flattenedDoc[SERVICE_NAME_FIELD]}
                  formattedName={formattedName}
                  id={id}
                  formattedId={formattedId}
                  showActions={showActions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                {spanAndTransactionFields.map((fieldId) => (
                  <SummaryField
                    key={fieldId}
                    fieldId={fieldId}
                    fieldMapping={dataViewFields[fieldId]}
                    fieldConfiguration={fieldConfigurations[fieldId]}
                    showActions={showActions}
                  />
                ))}
              </EuiFlexItem>

              {duration && (
                <EuiFlexItem>
                  <EuiSpacer size="m" />
                  <DurationSummary
                    duration={duration}
                    spanName={flattenedDoc[SPAN_NAME_FIELD]}
                    transactionName={flattenedDoc[TRANSACTION_NAME_FIELD]}
                    transactionType={flattenedDoc[TRANSACTION_TYPE_FIELD]}
                    serviceName={flattenedDoc[SERVICE_NAME_FIELD]}
                    isOtelSpan={isOtelSpan}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiSpacer size="m" />
                <Trace
                  fields={fieldConfigurations}
                  fieldMappings={dataViewFields}
                  traceId={traceId}
                  docId={id}
                  displayType={displayType}
                  dataView={dataView}
                  showWaterfall={showWaterfall}
                  showActions={showActions}
                />
              </EuiFlexItem>
              {spanId && (
                <EuiFlexItem>
                  <EuiSpacer size="m" />
                  <SpanLinks traceId={traceId} docId={spanId} />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiSpacer size="m" />
                <TraceContextLogEvents
                  traceId={flattenedDoc[TRACE_ID_FIELD]}
                  spanId={flattenedDoc[SPAN_ID_FIELD]}
                  transactionId={transactionId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </FieldActionsProvider>
        </RootSpanProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
