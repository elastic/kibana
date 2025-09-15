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
import { getRouterLinkProps } from '@kbn/router-utils';
import { TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR } from '@kbn/deeplinks-observability';
import { getUnifiedDocViewerServices } from '../../../../plugin';

interface TraceIdLinkProps {
  traceId: string;
  formattedTraceId: React.ReactNode;
}

export function TraceIdLink({ traceId, formattedTraceId }: TraceIdLinkProps) {
  const {
    share: { url: urlService },
    core,
    data: dataService,
  } = getUnifiedDocViewerServices();

  const canViewApm = core.application.capabilities.apm?.show || false;
  const { from: timeRangeFrom, to: timeRangeTo } =
    dataService.query.timefilter.timefilter.getTime();

  const apmLinkToTransactionByTraceIdLocator = urlService.locators.get<{
    traceId: string;
    rangeFrom: string;
    rangeTo: string;
  }>(TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR);

  const href = apmLinkToTransactionByTraceIdLocator?.getRedirectUrl({
    traceId,
    rangeFrom: timeRangeFrom,
    rangeTo: timeRangeTo,
  });
  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => {
          apmLinkToTransactionByTraceIdLocator?.navigate({
            traceId,
            rangeFrom: timeRangeFrom,
            rangeTo: timeRangeTo,
          });
        },
      })
    : undefined;

  return (
    <>
      {canViewApm && routeLinkProps ? (
        <EuiLink
          {...routeLinkProps}
          data-test-subj="unifiedDocViewerObservabilityTracesTraceIdLink"
        >
          {formattedTraceId}
        </EuiLink>
      ) : (
        <EuiText size="xs">{traceId}</EuiText>
      )}
    </>
  );
}
