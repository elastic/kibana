/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
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

export type SpanOverviewProps = DocViewRenderProps & {
  transactionIndexPattern: string;
};

export function SpanOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  transactionIndexPattern,
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
    <TransactionProvider transactionId={transactionId} indexPattern={transactionIndexPattern}>
      <FieldActionsProvider
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      >
        <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
          <EuiSpacer size="m" />
          <SpanSummaryTitle
            spanName={flattenedDoc[SPAN_NAME_FIELD]}
            formattedSpanName={formattedDoc[SPAN_NAME_FIELD]}
            spanId={flattenedDoc[SPAN_ID_FIELD]}
            formattedSpanId={formattedDoc[SPAN_ID_FIELD]}
          />
          <EuiSpacer size="m" />
          {spanFields.map((fieldId) => (
            <SpanSummaryField
              key={fieldId}
              fieldId={fieldId}
              fieldConfiguration={fieldConfigurations[fieldId]}
            />
          ))}

          {spanDuration && (
            <>
              <EuiSpacer size="m" />
              <SpanDurationSummary
                spanDuration={spanDuration}
                spanName={formattedDoc[SPAN_NAME_FIELD]}
                serviceName={formattedDoc[SERVICE_NAME_FIELD]}
              />
            </>
          )}
          <EuiSpacer size="m" />
          <Trace
            fields={fieldConfigurations}
            traceId={flattenedDoc[TRACE_ID_FIELD]}
            docId={flattenedDoc[SPAN_ID_FIELD]}
            displayType="span"
          />
        </EuiPanel>
      </FieldActionsProvider>
    </TransactionProvider>
  );
}
