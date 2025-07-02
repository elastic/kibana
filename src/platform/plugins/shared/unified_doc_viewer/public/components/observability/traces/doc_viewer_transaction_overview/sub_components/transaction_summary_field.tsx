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
import { FieldConfiguration } from '../../resources/get_field_configuration';
import { FieldWithActions } from '../../components/field_with_actions/field_with_actions';

export interface TransactionSummaryFieldProps {
  fieldId: string;
  fieldConfiguration: FieldConfiguration;
  showActions?: boolean;
}

export function TransactionSummaryField({
  fieldConfiguration,
  fieldId,
  showActions = true,
}: TransactionSummaryFieldProps) {
  if (!fieldConfiguration.value) {
    return null;
  }

  return (
    <>
      <FieldWithActions
        data-test-subj={`unifiedDocViewerObservabilityTracesAttribute-${fieldId}`}
        label={fieldConfiguration.title}
        field={fieldId}
        value={fieldConfiguration.value as string}
        formattedValue={fieldConfiguration.value as string}
        fieldMetadata={fieldConfiguration.fieldMetadata}
        showActions={showActions}
      >
        <div>
          {fieldConfiguration.content(fieldConfiguration.value, fieldConfiguration.formattedValue)}
        </div>
      </FieldWithActions>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}
