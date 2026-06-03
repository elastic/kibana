/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { LatencyAggregationType } from '@kbn/apm-types';
import {
  SERVICE_TRANSACTIONS_LOCATOR_ID,
  TRANSACTION_DETAILS_BY_NAME_LOCATOR,
  type ServiceTransactionsLocatorParams,
  type TransactionDetailsByNameParams,
} from '@kbn/deeplinks-observability';
import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TransactionGroup } from '../../transactions_table/types';
import { TransactionsTable } from '../../transactions_table';
import { SERVICE_FLYOUT_TRANSACTIONS_EBT_ELEMENTS } from './ebt_constants';
import { useServiceFlyoutTransactions } from './use_service_flyout_transactions';

const MAX_GROUPS_TOOLTIP = (
  <EuiText size="s" style={{ maxWidth: 448 }}>
    <FormattedMessage
      id="apmUiShared.serviceFlyout.transactions.maxGroupsTooltip"
      defaultMessage="The cardinality of APM data being collected is too high. Please review {docs} to mitigate the situation."
      values={{
        docs: (
          <EuiLink
            href="https://www.elastic.co/guide/en/kibana/8.7/troubleshooting.html#troubleshooting-too-many-transactions"
            target="_blank"
          >
            {i18n.translate('apmUiShared.serviceFlyout.transactions.maxGroupsDocsLink', {
              defaultMessage: 'docs',
            })}
          </EuiLink>
        ),
      }}
    />
  </EuiText>
);

interface LocatorClient {
  get<P extends Record<string, unknown>>(
    id: string
  ): { getRedirectUrl(params: P): string } | undefined;
}

interface ServiceFlyoutTransactionsSectionProps {
  http: HttpStart;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType?: LatencyAggregationType;
  locators?: LocatorClient;
}

export function ServiceFlyoutTransactionsSection({
  http,
  serviceName,
  environment,
  start,
  end,
  transactionType,
  latencyAggregationType,
  locators,
}: ServiceFlyoutTransactionsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { items, isLoading, maxCountExceeded } = useServiceFlyoutTransactions({
    http,
    serviceName,
    environment,
    start,
    end,
    transactionType,
    latencyAggregationType,
    searchQuery,
  });

  const openInTransactionsLocator = locators?.get<ServiceTransactionsLocatorParams>(
    SERVICE_TRANSACTIONS_LOCATOR_ID
  );
  const transactionDetailLocator = locators?.get<TransactionDetailsByNameParams>(
    TRANSACTION_DETAILS_BY_NAME_LOCATOR
  );

  const openInTransactionsHref = openInTransactionsLocator?.getRedirectUrl({
    serviceName,
    environment,
    rangeFrom: start,
    rangeTo: end,
    transactionType,
    latencyAggregationType,
  });

  const getTransactionDetailHref = useCallback(
    (item: TransactionGroup) =>
      transactionDetailLocator?.getRedirectUrl({
        serviceName,
        transactionName: item.name,
        rangeFrom: start,
        rangeTo: end,
      }),
    [transactionDetailLocator, serviceName, start, end]
  );

  return (
    <TransactionsTable
      items={items}
      isLoading={isLoading}
      maxCountExceeded={maxCountExceeded}
      latencyAggregationType={latencyAggregationType}
      showSparklines={false}
      columns={['name', 'alerts', 'latency', 'throughput', 'errorRate']}
      headerActions={
        openInTransactionsHref
          ? [
              {
                label: i18n.translate('apmUiShared.serviceFlyout.transactions.openInApm', {
                  defaultMessage: 'Open in APM',
                }),
                href: openInTransactionsHref,
                ebt: {
                  action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
                  element: SERVICE_FLYOUT_TRANSACTIONS_EBT_ELEMENTS.HEADER,
                },
              },
            ]
          : undefined
      }
      showMaxTransactionGroupsExceededWarning
      remainingTransactionsCellTooltipContent={MAX_GROUPS_TOOLTIP}
      columnInteractions={{ name: { href: getTransactionDetailHref } }}
      onSearchQueryChange={setSearchQuery}
    />
  );
}
