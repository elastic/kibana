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
import { getRouterLinkProps } from '@kbn/router-utils';
import { HighlightField, HighlightFieldProps } from './highlight_field';
import { getUnifiedDocViewerServices } from '../../../plugin';

const TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR = 'TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR';

export function TraceIdHighlightField(props: HighlightFieldProps) {
  const {
    share: { url: urlService },
    core,
  } = getUnifiedDocViewerServices();
  const canViewApm = core.application.capabilities.apm.show;

  const apmLinkToServiceEntityLocator = urlService.locators.get<{ traceId: string }>(
    TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR
  );
  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    traceId: props.value as string,
  });

  const routeLinkProps = getRouterLinkProps({
    href,
    onClick: () => apmLinkToServiceEntityLocator?.navigate({ traceId: props.value as string }),
  });
  return (
    <HighlightField {...props}>
      {canViewApm
        ? ({ content }) => (
            <EuiLink
              {...routeLinkProps}
              data-test-subj="unifiedDocViewLogsOverviewTraceIdHighlightLink"
            >
              {content}
            </EuiLink>
          )
        : undefined}
    </HighlightField>
  );
}
