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
  SPAN_ID_FIELD,
  SPAN_NAME_FIELD,
  TRANSACTION_ID_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import React from 'react';
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';
import { HighlightField } from '../../components/highlight_field';
import { TransactionNameLink } from '../../components/transaction_name_link';

export interface SummaryTitleProps {
  spanName?: string;
  transactionName?: string;
  formattedName?: string;
  serviceName?: string;
  id?: string;
  formattedId?: string;
  showActions?: boolean;
}

const FieldContent = ({
  children,
  field,
  title,
  value,
  showActions,
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

export const SummaryTitle = ({
  spanName,
  transactionName,
  serviceName,
  id,
  formattedId,
  formattedName,
  showActions = true,
}: SummaryTitleProps) => {
  const name = transactionName || spanName;

  const idField = transactionName ? TRANSACTION_ID_FIELD : SPAN_ID_FIELD;
  const nameField = transactionName ? TRANSACTION_NAME_FIELD : SPAN_NAME_FIELD;

  let nameContent;
  let idContent;

  if (name) {
    nameContent = (
      <>
        <FieldContent title={name} value={name} field={nameField} showActions={showActions}>
          <EuiTitle size="xs">
            <h2>
              <HighlightField textSize="m" value={name} formattedValue={formattedName} as="strong">
                {transactionName && serviceName
                  ? ({ content }) => (
                      <TransactionNameLink
                        serviceName={serviceName}
                        transactionName={transactionName}
                        renderContent={() => content}
                      />
                    )
                  : undefined}
              </HighlightField>
            </h2>
          </EuiTitle>
        </FieldContent>
      </>
    );
  } else if (serviceName) {
    nameContent = (
      <FieldContent
        title={serviceName}
        value={serviceName}
        field={SERVICE_NAME_FIELD}
        showActions={showActions}
      >
        {serviceName}
      </FieldContent>
    );
  }

  if (id) {
    idContent = (
      <FieldContent title={id} value={id} field={idField} showActions={showActions}>
        <HighlightField value={id} formattedValue={formattedId} />
      </FieldContent>
    );
  }

  return (
    <>
      {nameContent}
      {idContent}
    </>
  );
};
