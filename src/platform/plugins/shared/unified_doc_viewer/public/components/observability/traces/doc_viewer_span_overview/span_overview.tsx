/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import {
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_ID_FIELD,
  SPAN_NAME_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
  getSpanDocumentOverview,
} from '@kbn/discover-utils';
import { getFlattenedSpanDocumentOverview } from '@kbn/discover-utils/src';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { Trace } from '../components/trace';
import { TransactionProvider } from './hooks/use_transaction';
import { spanFields } from './resources/fields';
import { getSpanFieldConfiguration } from './resources/get_span_field_configuration';
import { SpanDurationSummary } from './sub_components/span_duration_summary';
import { SpanSummaryField } from './sub_components/span_summary_field';
import { SpanSummaryTitle } from './sub_components/span_summary_title';
import { RootTransactionProvider } from '../doc_viewer_transaction_overview/hooks/use_root_transaction';
import { DataSourcesProvider } from '../hooks/use_data_sources';

export type SpanOverviewProps = DocViewRenderProps & {
  tracesIndexPattern: string;
  apmErrorsIndexPattern: string;
  showWaterfall?: boolean;
  showActions?: boolean;
};

export function SpanOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  tracesIndexPattern,
  apmErrorsIndexPattern,
  showWaterfall = true,
  showActions = true,
  dataView,
}: SpanOverviewProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const { formattedDoc, flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getSpanDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedSpanDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );
  const fieldConfigurations = useMemo(
    () => getSpanFieldConfiguration({ attributes: formattedDoc, flattenedDoc }),
    [formattedDoc, flattenedDoc]
  );

  const spanDuration = flattenedDoc[SPAN_DURATION_FIELD];
  const transactionId = flattenedDoc[TRANSACTION_ID_FIELD];

  return (
    <DataSourcesProvider
      tracesIndexPattern={tracesIndexPattern}
      apmErrorsIndexPattern={apmErrorsIndexPattern}
    >
      <RootTransactionProvider
        traceId={flattenedDoc[TRACE_ID_FIELD]}
        indexPattern={tracesIndexPattern}
      >
        <TransactionProvider transactionId={transactionId} indexPattern={tracesIndexPattern}>
          <FieldActionsProvider
            columns={columns}
            filter={filter}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
          >
            <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
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
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <Trace
                    fields={fieldConfigurations}
                    traceId={flattenedDoc[TRACE_ID_FIELD]}
                    docId={flattenedDoc[SPAN_ID_FIELD]}
                    displayType="span"
                    dataView={dataView}
                    tracesIndexPattern={tracesIndexPattern}
                    showWaterfall={showWaterfall}
                    showActions={showActions}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </FieldActionsProvider>
        </TransactionProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
