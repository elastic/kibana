/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';

interface Props {
  traceId: string;
  transactionName?: string;
}

export const TransactionLink: React.FC<Props> = ({ traceId, transactionName }: Props) => {
  const { share } = useDiscoverServices();
  const transactionLocator = share?.url.locators.get<{ traceId: string }>(
    'TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR'
  );
  return (
    <EuiLink href={transactionLocator?.getRedirectUrl({ traceId })} target="_blank">
      {/* TODO get transaction name if not present */}
      {transactionName ?? 'Root transaction'}
    </EuiLink>
  );
};
