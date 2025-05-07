/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { HighlightField } from '../../components/highlight_field.tsx';
import { TransactionNameLink } from '../../components/transaction_name_link';

export interface TransactionSummaryTitleProps {
  serviceName: string;
  transactionName?: string;
  formattedTransactionName?: string;
  id?: string;
  formattedId?: string;
}

export const TransactionSummaryTitle = ({
  serviceName,
  transactionName,
  id,
  formattedId,
  formattedTransactionName,
}: TransactionSummaryTitleProps) => {
  return (
    <>
      <EuiTitle size="xs">
        <h2>
          {transactionName ? (
            <TransactionNameLink
              serviceName={serviceName}
              transactionName={transactionName}
              renderContent={() => {
                return formattedTransactionName ? (
                  // Value returned from formatFieldValue is always sanitized
                  // eslint-disable-next-line react/no-danger
                  <strong dangerouslySetInnerHTML={{ __html: formattedTransactionName }} />
                ) : (
                  <strong>{transactionName}</strong>
                );
              }}
            />
          ) : (
            serviceName
          )}
        </h2>
      </EuiTitle>

      {id && <HighlightField value={id} formattedValue={formattedId} textSize="xs" />}
    </>
  );
};
