/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TRANSACTION_NAME_FIELD } from '@kbn/discover-utils';
import { EuiHorizontalRule } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { FieldWithActions } from '../../components/field_with_actions/field_with_actions';
import { useTransactionContext } from '../hooks/use_transaction';
import { FieldConfiguration } from '../../resources/get_field_configuration';
export interface SpanSummaryFieldProps {
  fieldId: string;
  fieldConfiguration: FieldConfiguration;
}

export function SpanSummaryField({ fieldConfiguration, fieldId }: SpanSummaryFieldProps) {
  const { transaction, loading } = useTransactionContext();
  const [fieldValue, setFieldValue] = useState(fieldConfiguration.value);
  const isTransactionNameField = fieldId === TRANSACTION_NAME_FIELD;
  const isTransactionNameFieldWithoutValue = isTransactionNameField && !fieldValue;

  useEffect(() => {
    if (isTransactionNameField && !fieldValue && transaction?.name && !loading) {
      setFieldValue(transaction.name);
    }
  }, [transaction?.name, loading, fieldValue, isTransactionNameField]);

  if (
    (!isTransactionNameFieldWithoutValue && !fieldValue) ||
    (isTransactionNameFieldWithoutValue && !loading)
  ) {
    return null;
  }

  return (
    <>
      <FieldWithActions
        data-test-subj={`unifiedDocViewerObservabilityTracesAttribute-${fieldId}`}
        label={fieldConfiguration.title}
        field={fieldId}
        value={fieldValue as string}
        formattedValue={fieldValue as string}
        fieldMetadata={fieldConfiguration.fieldMetadata}
        loading={isTransactionNameFieldWithoutValue && loading}
      >
        <div>{fieldConfiguration.content(fieldValue, fieldConfiguration.formattedValue)}</div>
      </FieldWithActions>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}
