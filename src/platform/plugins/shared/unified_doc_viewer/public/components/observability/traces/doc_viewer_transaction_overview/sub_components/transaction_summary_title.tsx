/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { TransactionNameLink } from '../../components/transaction_name_link';
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';

interface TransactionSummaryField {
  field: string;
  value?: string;
}

export interface TransactionSummaryTitleProps {
  serviceName: string;
  name: TransactionSummaryField;
  id: TransactionSummaryField;
}

const renderTransactionTitle = (transactionName: string) => <strong>{transactionName}</strong>;

export const TransactionSummaryTitle = ({
  serviceName,
  name,
  id,
}: TransactionSummaryTitleProps) => {
  return (
    <>
      <EuiTitle size="xs">
        <h2>
          {name.value ? (
            <FieldHoverActionPopover title={name.value} value={name.value} field={name.field}>
              <TransactionNameLink
                serviceName={serviceName}
                transactionName={name.value}
                renderContent={renderTransactionTitle}
              />
            </FieldHoverActionPopover>
          ) : (
            serviceName
          )}
        </h2>
      </EuiTitle>

      {id.value && (
        <FieldHoverActionPopover title={id.value} value={id.value} field={id.field}>
          <EuiText size="xs" color="subdued">
            {id.value}
          </EuiText>
        </FieldHoverActionPopover>
      )}
    </>
  );
};
