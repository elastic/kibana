/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import { TRANSACTION_NAME_FIELD } from '@kbn/discover-utils';
import { useTransactionContext } from '../../../hooks/use_transaction';
import { FieldWithActions } from './field_with_actions/field_with_actions';

export interface TraceSummaryProps {
  fieldId: string;
  fieldConfiguration: any;
}

export function TraceSummary({ fieldConfiguration, fieldId }: TraceSummaryProps) {
  const { transaction } = useTransactionContext();

  if (fieldId === TRANSACTION_NAME_FIELD) {
    if (transaction) {
      fieldConfiguration.value = transaction.name;
    }
  }

  if (!fieldConfiguration.value) {
    return null;
  }

  return (
    <>
      <FieldWithActions
        data-test-subj={`unifiedDocViewTracesOverviewAttribute-${fieldId}`}
        label={fieldConfiguration.title}
        field={fieldId}
        value={fieldConfiguration.value}
        formattedValue={fieldConfiguration.value}
        fieldMetadata={fieldConfiguration.fieldMetadata}
      >
        {() => <div>{fieldConfiguration.content(fieldConfiguration.value)}</div>}
      </FieldWithActions>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}
