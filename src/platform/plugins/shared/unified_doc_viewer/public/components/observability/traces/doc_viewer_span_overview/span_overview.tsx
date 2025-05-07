/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import {
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  TRACE_ID_FIELD,
  SPAN_ID_FIELD,
  SPAN_NAME_FIELD,
  TRANSACTION_ID_FIELD,
  getSpanDocumentOverview,
} from '@kbn/discover-utils';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { TransactionProvider } from './hooks/use_transaction';
import { spanFields } from './resources/fields';
import { getSpanFieldConfiguration } from './resources/get_span_field_configuration';
import { SpanSummaryField } from './sub_components/span_summary_field';
import { SpanDurationSummary } from './sub_components/span_duration_summary';
import { Trace } from '../components/trace';
import { SpanSummaryTitle } from './sub_components/span_summary_title';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { getTraceDocValue } from '../resources/get_field_value';

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
  const formattedDoc = useMemo(
    () => getSpanDocumentOverview(hit, { dataView, fieldFormats }),
    [dataView, fieldFormats, hit]
  );
  const fieldConfigurations = useMemo(
    () => getSpanFieldConfiguration({ attributes: formattedDoc, flattenedDoc: hit.flattened }),
    [hit.flattened, formattedDoc]
  );

  const spanDuration = getTraceDocValue(SPAN_DURATION_FIELD, hit.flattened);
  const transactionId = getTraceDocValue(TRANSACTION_ID_FIELD, hit.flattened);

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
            spanName={getTraceDocValue(SPAN_NAME_FIELD, hit.flattened)}
            formattedSpanName={formattedDoc[SPAN_NAME_FIELD]}
            id={getTraceDocValue(SPAN_ID_FIELD, hit.flattened)}
            formattedId={formattedDoc[SPAN_ID_FIELD]}
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
            traceId={getTraceDocValue(TRACE_ID_FIELD, hit.flattened)}
            docId={getTraceDocValue(SPAN_ID_FIELD, hit.flattened)}
            displayType="span"
          />
        </EuiPanel>
      </FieldActionsProvider>
    </TransactionProvider>
  );
}
