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

export interface TransactionSummaryTitleProps {
  serviceName: string;
  name?: string;
  id?: string;
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
          {name ? (
            <TransactionNameLink
              serviceName={serviceName}
              transactionName={name}
              renderContent={renderTransactionTitle}
            />
          ) : (
            serviceName
          )}
        </h2>
      </EuiTitle>

      {id && (
        <EuiText size="xs" color="subdued">
          {id}
        </EuiText>
      )}
    </>
  );
};
