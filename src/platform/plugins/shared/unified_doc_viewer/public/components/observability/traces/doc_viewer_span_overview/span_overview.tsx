/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TRANSACTION_ID_FIELD, getTraceDocumentOverview } from '@kbn/discover-utils';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { TransactionProvider } from './hooks/use_transaction';
import { spanFields } from './resources/fields';
import { getSpanFieldConfiguration } from './resources/get_span_field_configuration';
import { SpanSummary } from './sub_components/span_summary';
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
  const parsedDoc = getTraceDocumentOverview(hit);

  const detailTitle = i18n.translate('unifiedDocViewer.observability.traces.spanOverview.title', {
    defaultMessage: 'Span detail',
  });

  return (
    <TransactionProvider
      transactionId={parsedDoc[TRANSACTION_ID_FIELD]}
      indexPattern={transactionIndexPattern}
    >
      <FieldActionsProvider
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      >
        <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
          <EuiSpacer size="m" />
          <EuiTitle size="s">
            <h2>{detailTitle}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          {spanFields.map((fieldId) => {
            const fieldConfiguration = getSpanFieldConfiguration(parsedDoc)[fieldId];

            return (
              <SpanSummary
                key={fieldId}
                fieldId={fieldId}
                fieldConfiguration={fieldConfiguration}
              />
            );
          })}
        </EuiPanel>
      </FieldActionsProvider>
    </TransactionProvider>
  );
}
