/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import {
  TRANSACTION_DETAILS_BY_NAME_LOCATOR,
  type TransactionDetailsByNameParams,
} from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import { getEbtProps, type EbtClickAttrs } from '@kbn/ebt-click';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { TRACES_DOC_VIEWER_EBT_CLICK_ACTIONS } from '../ebt_constants';

interface TransactionNameLinkProps {
  serviceName?: string;
  transactionName: string;
  renderContent?: (name: string) => React.ReactNode;
  ebt: Omit<EbtClickAttrs, 'action'>;
}

export function TransactionNameLink({
  transactionName,
  serviceName,
  renderContent,
  ebt,
}: TransactionNameLinkProps) {
  const {
    share: { url: urlService },
    core,
    data: dataService,
  } = getUnifiedDocViewerServices();

  const canViewApm = core.application.capabilities.apm?.show || false;
  const { from: timeRangeFrom, to: timeRangeTo } =
    dataService.query.timefilter.timefilter.getTime();

  const apmLinkToTransactionByNameLocator = urlService.locators.get<TransactionDetailsByNameParams>(
    TRANSACTION_DETAILS_BY_NAME_LOCATOR
  );

  const href =
    serviceName &&
    apmLinkToTransactionByNameLocator?.getRedirectUrl({
      serviceName,
      transactionName,
      rangeFrom: timeRangeFrom,
      rangeTo: timeRangeTo,
    });
  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => {
          apmLinkToTransactionByNameLocator?.navigate({
            serviceName,
            transactionName,
            rangeFrom: timeRangeFrom,
            rangeTo: timeRangeTo,
          });
        },
      })
    : undefined;

  const content = renderContent?.(transactionName) ?? (
    <EuiText size="xs">{transactionName}</EuiText>
  );

  return (
    <>
      {canViewApm && routeLinkProps ? (
        <EuiLink
          {...routeLinkProps}
          data-test-subj="unifiedDocViewerObservabilityTracesTransactionNameLink"
          {...getEbtProps({ action: TRACES_DOC_VIEWER_EBT_CLICK_ACTIONS.VIEW_TRANSACTION, ...ebt })}
        >
          {content}
        </EuiLink>
      ) : (
        content
      )}
    </>
  );
}
