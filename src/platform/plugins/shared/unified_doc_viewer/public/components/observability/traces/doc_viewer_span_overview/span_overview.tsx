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
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
  getTraceDocumentOverview,
} from '@kbn/discover-utils';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { TransactionProvider } from './hooks/use_transaction';
import { spanFields } from './resources/fields';
import { getSpanFieldConfiguration } from './resources/get_span_field_configuration';
import { SpanSummaryField } from './sub_components/span_summary_field';
import { SpanDurationSummary } from './sub_components/span_duration_summary';
import { Trace } from '../components/trace';

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
}: SpanOverviewProps) {
  const parsedDoc = useMemo(() => getTraceDocumentOverview(hit), [hit]);
  const spanDuration = parsedDoc[SPAN_DURATION_FIELD];
  const transactionId = parsedDoc[TRANSACTION_ID_FIELD];
  const fieldConfigurations = useMemo(() => getSpanFieldConfiguration(parsedDoc), [parsedDoc]);

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
          <EuiTitle size="s">
            <h2>
              {i18n.translate('unifiedDocViewer.observability.traces.spanOverview.title', {
                defaultMessage: 'Span detail',
              })}
            </h2>
          </EuiTitle>
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
              <SpanDurationSummary duration={spanDuration} />
            </>
          )}
          {transactionId && (
            <>
              <EuiSpacer size="m" />
              <Trace
                fields={fieldConfigurations}
                serviceName={parsedDoc[SERVICE_NAME_FIELD]}
                traceId={parsedDoc[TRACE_ID_FIELD]}
                transactionId={transactionId}
                displayType="span"
              />
            </>
          )}
        </EuiPanel>
      </FieldActionsProvider>
    </TransactionProvider>
  );
}
