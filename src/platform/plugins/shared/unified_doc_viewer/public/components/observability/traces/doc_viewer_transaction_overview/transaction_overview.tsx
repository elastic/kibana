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
  TRACE_ID_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_ID_FIELD,
  TRANSACTION_NAME_FIELD,
  getTraceDocumentOverview,
} from '@kbn/discover-utils';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { transactionFields } from './resources/fields';
import { getTransactionFieldConfiguration } from './resources/get_transaction_field_configuration';
import { TransactionSummaryField } from './sub_components/transaction_summary_field';
import { TransactionDurationSummary } from './sub_components/transaction_duration_summary';
import { RootTransactionProvider } from './hooks/use_root_transaction';
import { Trace } from '../components/trace';

import { TransactionSummaryTitle } from './sub_components/transaction_summary_title';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { getTraceDocValue } from '../resources/get_field_value';
export type TransactionOverviewProps = DocViewRenderProps & {
  tracesIndexPattern: string;
};

export function TransactionOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  tracesIndexPattern,
  dataView,
}: TransactionOverviewProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const parsedDoc = useMemo(
    () => getTraceDocumentOverview(hit, { dataView, fieldFormats }),
    [dataView, fieldFormats, hit]
  );
  const transactionDuration = getTraceDocValue(TRANSACTION_DURATION_FIELD, hit.flattened);
  const fieldConfigurations = useMemo(
    () => getTransactionFieldConfiguration({ attributes: parsedDoc, flattenedDoc: hit.flattened }),
    [hit.flattened, parsedDoc]
  );
  const traceId = getTraceDocValue(TRACE_ID_FIELD, hit.flattened);
  const transactionId = getTraceDocValue(TRANSACTION_ID_FIELD, hit.flattened);

  return (
    <RootTransactionProvider traceId={traceId} indexPattern={tracesIndexPattern}>
      <FieldActionsProvider
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      >
        <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
          <EuiSpacer size="m" />
          <TransactionSummaryTitle
            serviceName={getTraceDocValue(SERVICE_NAME_FIELD, hit.flattened)}
            id={transactionId}
            formattedId={parsedDoc[TRANSACTION_ID_FIELD]}
            transactionName={getTraceDocValue(TRANSACTION_NAME_FIELD, hit.flattened)}
            formattedTransactionName={parsedDoc[TRANSACTION_NAME_FIELD]}
          />
          <EuiSpacer size="m" />
          {transactionFields.map((fieldId) => (
            <TransactionSummaryField
              key={fieldId}
              fieldId={fieldId}
              fieldConfiguration={fieldConfigurations[fieldId]}
            />
          ))}

          {transactionDuration && (
            <>
              <EuiSpacer size="m" />
              <TransactionDurationSummary duration={transactionDuration} />
            </>
          )}
          {traceId && transactionId ? (
            <>
              <EuiSpacer size="m" />
              <Trace
                fields={fieldConfigurations}
                traceId={traceId}
                docId={transactionId}
                displayType="transaction"
              />
            </>
          ) : null}
        </EuiPanel>
      </FieldActionsProvider>
    </RootTransactionProvider>
  );
}
