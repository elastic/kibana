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
import {
  SERVICE_NAME_FIELD,
  TRANSACTION_ID_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import { TransactionNameLink } from '../../components/transaction_name_link';
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';

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
            <FieldHoverActionPopover title={name} value={name} field={TRANSACTION_NAME_FIELD}>
              <TransactionNameLink
                serviceName={serviceName}
                transactionName={name}
                renderContent={renderTransactionTitle}
              />
            </FieldHoverActionPopover>
          ) : (
            <FieldHoverActionPopover
              title={serviceName}
              value={serviceName}
              field={SERVICE_NAME_FIELD}
            >
              {serviceName}
            </FieldHoverActionPopover>
          )}
        </h2>
      </EuiTitle>

      {id && (
        <FieldHoverActionPopover title={id} value={id} field={TRANSACTION_ID_FIELD}>
          <EuiText size="xs" color="subdued">
            {id}
          </EuiText>
        </FieldHoverActionPopover>
      )}
    </>
  );
};
