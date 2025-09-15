/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle } from '@elastic/eui';
import {
  SERVICE_NAME_FIELD,
  TRANSACTION_ID_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import React from 'react';
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';
import { HighlightField } from '../../components/highlight_field.tsx';
import { TransactionNameLink } from '../../components/transaction_name_link';

export interface TransactionSummaryTitleProps {
  serviceName: string;
  transactionName?: string;
  formattedTransactionName?: string;
  id?: string;
  formattedId?: string;
  showActions?: boolean;
}

export const TransactionSummaryTitle = ({
  serviceName,
  transactionName,
  id,
  formattedId,
  formattedTransactionName,
  showActions = true,
}: TransactionSummaryTitleProps) => {
  const FieldContent = ({
    children,
    field,
    title,
    value,
  }: {
    children: React.ReactNode;
    field: string;
    title: string;
    value: string;
    showActions: boolean;
  }) => {
    return showActions ? (
      <FieldHoverActionPopover title={title} value={value} field={field}>
        <>{children}</>
      </FieldHoverActionPopover>
    ) : (
      <>{children}</>
    );
  };

  return (
    <>
      <EuiTitle size="xs">
        <h2>
          {transactionName ? (
            <FieldContent
              title={transactionName}
              value={transactionName}
              field={TRANSACTION_NAME_FIELD}
              showActions={showActions}
            >
              <HighlightField
                value={transactionName}
                formattedValue={formattedTransactionName}
                as="strong"
              >
                {({ content }) => (
                  <TransactionNameLink
                    serviceName={serviceName}
                    transactionName={transactionName}
                    renderContent={() => content}
                  />
                )}
              </HighlightField>
            </FieldContent>
          ) : (
            <FieldContent
              title={serviceName}
              value={serviceName}
              field={SERVICE_NAME_FIELD}
              showActions={showActions}
            >
              {serviceName}
            </FieldContent>
          )}
        </h2>
      </EuiTitle>

      {id && (
        <FieldContent title={id} value={id} field={TRANSACTION_ID_FIELD} showActions={showActions}>
          <HighlightField value={id} formattedValue={formattedId} textSize="xs" />
        </FieldContent>
      )}
    </>
  );
};
