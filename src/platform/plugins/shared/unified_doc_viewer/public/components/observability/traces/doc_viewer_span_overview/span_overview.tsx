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
import { getFlattenedSpanDocumentOverview } from '@kbn/discover-utils/src';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useDataViewFields } from '../../../../hooks/use_data_view_fields';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { SpanLinks } from '../components/span_links';
import { Trace } from '../components/trace';
import { RootTransactionProvider } from '../doc_viewer_transaction_overview/hooks/use_root_transaction';
import type { TraceIndexes } from '../hooks/use_data_sources';
import { DataSourcesProvider } from '../hooks/use_data_sources';
import { RootSpanProvider } from './hooks/use_root_span';
import { allSpanFields, spanFields } from './resources/fields';
import { getSpanFieldConfiguration } from './resources/get_span_field_configuration';
import { SpanDurationSummary } from './sub_components/span_duration_summary';
import { SpanSummaryField } from './sub_components/span_summary_field';
import { SpanSummaryTitle } from './sub_components/span_summary_title';
import {
  getTabContentAvailableHeight,
  DEFAULT_MARGIN_BOTTOM,
} from '../../../doc_viewer_source/get_height';

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
  showActions = true,
  dataView,
  columnsMeta,
  decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
}: SpanOverviewProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { fieldFormats } = getUnifiedDocViewerServices();
  const { formattedDoc, flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getSpanDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedSpanDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );
  const { dataViewFields } = useDataViewFields({ fields: allSpanFields, dataView, columnsMeta });
  const fieldConfigurations = useMemo(
    () => getSpanFieldConfiguration({ attributes: formattedDoc, flattenedDoc }),
    [formattedDoc, flattenedDoc]
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
                <SpanSummaryTitle
                  spanName={flattenedDoc[SPAN_NAME_FIELD]}
                  formattedSpanName={formattedDoc[SPAN_NAME_FIELD]}
                  spanId={flattenedDoc[SPAN_ID_FIELD]}
                  formattedSpanId={formattedDoc[SPAN_ID_FIELD]}
                  showActions={showActions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                {spanFields.map((fieldId) => (
                  <SpanSummaryField
                    key={fieldId}
                    fieldId={fieldId}
                    fieldMapping={dataViewFields[fieldId]}
                    fieldConfiguration={fieldConfigurations[fieldId]}
                    showActions={showActions}
                  />
                ))}
              </EuiFlexItem>

              {spanDuration && (
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
                  fields={fieldConfigurations}
                  fieldMappings={dataViewFields}
                  traceId={flattenedDoc[TRACE_ID_FIELD]}
                  docId={flattenedDoc[SPAN_ID_FIELD]}
                  displayType="span"
                  dataView={dataView}
                  showWaterfall={showWaterfall}
                  showActions={showActions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSpacer size="m" />
                <SpanLinks traceId={traceId} docId={spanId} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </FieldActionsProvider>
        </RootSpanProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
