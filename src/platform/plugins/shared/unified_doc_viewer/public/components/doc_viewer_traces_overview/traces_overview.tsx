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
import { spanFieldIds, transactionFieldIds } from './resources/field_ids';
import { getFieldConfiguration } from './resources/get_field_configuration';
import { FieldActionsProvider } from '../../hooks/use_field_actions';
import { TransactionProvider } from '../../hooks/use_transaction';
import { TraceSummary } from './sub_components/trace_summary';
export type TracesOverviewProps = DocViewRenderProps;

export function TracesOverview({
  columns,
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: TracesOverviewProps) {
  const parsedDoc = getTraceDocumentOverview(hit);
  const isTransaction = !parsedDoc['parent.id'];
  const detailTitle = `${isTransaction ? 'Transaction' : 'Span'} ${i18n.translate(
    'unifiedDocViewer.docViewerTracesOverview.title',
    {
      defaultMessage: 'detail',
    }
  )}`;

  return (
    <TransactionProvider traceId={parsedDoc['trace.id']} indexPattern={dataView.getIndexPattern()}>
      <FieldActionsProvider
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      >
        <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
          <EuiSpacer size="m" />
          <EuiTitle size="s">
            <h1>{detailTitle}</h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          {(isTransaction ? transactionFieldIds : spanFieldIds).map((fieldId) => {
            const fieldConfiguration = getFieldConfiguration(parsedDoc)[fieldId];

            return (
              <TraceSummary
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
