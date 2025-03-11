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
import { getTraceDocumentOverview } from '@kbn/discover-utils';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { transactionFields } from './resources/fields';
import { getTransactionFieldConfiguration } from './resources/get_transaction_field_configuration';
import { TransactionSummary } from './sub_components/transaction_summary';
export type TransactionOverviewProps = DocViewRenderProps;

export function TransactionOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: TransactionOverviewProps) {
  const parsedDoc = getTraceDocumentOverview(hit);

  const detailTitle = i18n.translate(
    'unifiedDocViewer.observability.traces.transactionOverview.title',
    {
      defaultMessage: 'Transaction detail',
    }
  );

  return (
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
        {transactionFields.map((fieldId) => {
          const fieldConfiguration = getTransactionFieldConfiguration(parsedDoc)[fieldId];

          return (
            <TransactionSummary
              key={fieldId}
              fieldId={fieldId}
              fieldConfiguration={fieldConfiguration}
            />
          );
        })}
      </EuiPanel>
    </FieldActionsProvider>
  );
}
