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
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import {
  SERVICE_NAME_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
  TRANSACTION_TYPE_FIELD,
  getTransactionDocumentOverview,
  TRANSACTION_ID_FIELD,
} from '@kbn/discover-utils';
import { getFlattenedTransactionDocumentOverview } from '@kbn/discover-utils/src';
import { useDataViewFields } from '../../../../hooks/use_data_view_fields';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { transactionFields, allTransactionFields } from './resources/fields';
import { getTransactionFieldConfiguration } from './resources/get_transaction_field_configuration';
import { TransactionSummaryField } from './sub_components/transaction_summary_field';
import { TransactionDurationSummary } from './sub_components/transaction_duration_summary';
import { RootTransactionProvider } from './hooks/use_root_transaction';
import { Trace } from '../components/trace';
import { TransactionSummaryTitle } from './sub_components/transaction_summary_title';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { DataSourcesProvider } from '../hooks/use_data_sources';

export type TransactionOverviewProps = DocViewRenderProps & {
  indexes: {
    apm: {
      traces: string;
      errors: string;
    };
    logs: string;
  };
  showWaterfall?: boolean;
  showActions?: boolean;
};

export function TransactionOverview({
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
}: TransactionOverviewProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const { formattedDoc, flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getTransactionDocumentOverview(hit, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedTransactionDocumentOverview(hit),
    }),
    [dataView, fieldFormats, hit]
  );
  const { dataViewFields } = useDataViewFields({
    fields: allTransactionFields,
    dataView,
    columnsMeta,
  });
  const transactionDuration = flattenedDoc[TRANSACTION_DURATION_FIELD];
  const fieldConfigurations = useMemo(
    () => getTransactionFieldConfiguration({ attributes: formattedDoc, flattenedDoc }),
    [formattedDoc, flattenedDoc]
  );
  const traceId = flattenedDoc[TRACE_ID_FIELD];
  const transactionId = flattenedDoc[TRANSACTION_ID_FIELD];

  return (
    <DataSourcesProvider indexes={indexes}>
      <RootTransactionProvider traceId={traceId} indexPattern={indexes.apm.traces}>
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
                <TransactionSummaryTitle
                  serviceName={flattenedDoc[SERVICE_NAME_FIELD]}
                  transactionName={flattenedDoc[TRANSACTION_NAME_FIELD]}
                  formattedTransactionName={formattedDoc[TRANSACTION_NAME_FIELD]}
                  id={transactionId}
                  formattedId={formattedDoc[TRANSACTION_ID_FIELD]}
                  showActions={showActions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                {transactionFields.map((fieldId) => (
                  <TransactionSummaryField
                    key={fieldId}
                    fieldId={fieldId}
                    fieldMapping={dataViewFields[fieldId]}
                    fieldConfiguration={fieldConfigurations[fieldId]}
                    showActions={showActions}
                  />
                ))}
              </EuiFlexItem>
              {transactionDuration !== undefined && (
                <EuiFlexItem>
                  <TransactionDurationSummary
                    transactionDuration={transactionDuration}
                    transactionName={formattedDoc[TRANSACTION_NAME_FIELD]}
                    transactionType={formattedDoc[TRANSACTION_TYPE_FIELD]}
                    serviceName={formattedDoc[SERVICE_NAME_FIELD]}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                {traceId && transactionId && (
                  <Trace
                    fields={fieldConfigurations}
                    fieldMappings={dataViewFields}
                    traceId={traceId}
                    docId={transactionId}
                    displayType="transaction"
                    dataView={dataView}
                    tracesIndexPattern={indexes.apm.traces}
                    showWaterfall={showWaterfall}
                    showActions={showActions}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </FieldActionsProvider>
      </RootTransactionProvider>
    </DataSourcesProvider>
  );
}
