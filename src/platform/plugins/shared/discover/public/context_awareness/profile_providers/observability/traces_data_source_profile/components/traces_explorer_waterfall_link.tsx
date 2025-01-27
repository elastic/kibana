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
import { css } from '@emotion/react';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';

interface TracesExplorerWaterfallLinkProps {
  errorId?: string;
  spanId?: string;
}

export const TracesExplorerWaterfallLink: React.FC<TracesExplorerWaterfallLinkProps> = ({
  errorId,
  spanId,
}: TracesExplorerWaterfallLinkProps) => {
  const { share, data } = useDiscoverServices();
  const timeFilter = data.query.timefilter.timefilter.getTime();
  const traceExplorerWaterfallLocator = share?.url.locators.get<{
    rangeFrom: string;
    rangeTo: string;
    errorId?: string;
    spanId?: string;
  }>('TRACES_EXPLORER_WATERFALL_LOCATOR');

  return (
    <EuiLink
      href={traceExplorerWaterfallLocator?.getRedirectUrl({
        rangeFrom: timeFilter.from,
        rangeTo: timeFilter.to,
        errorId,
        spanId,
      })}
      target="_blank"
      data-test-subj=""
      css={css`
        line-break: anywhere;
      `}
    >
      Explore timeline
    </EuiLink>
  );
};
