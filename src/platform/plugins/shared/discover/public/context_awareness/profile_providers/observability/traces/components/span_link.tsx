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

interface SpanLinkProps {
  spanId: string;
  spanName: string;
  traceId: string;
}

export const SpanLink: React.FC<SpanLinkProps> = ({ spanId, spanName, traceId }: SpanLinkProps) => {
  const { share } = useDiscoverServices();
  const spanLocator = share?.url.locators.get<{ traceId: string; spanId: string }>(
    'SPAN_DETAILS_BY_SPAN_ID_AND_TRACE_ID_LOCATOR'
  );

  return (
    <EuiLink
      href={spanLocator?.getRedirectUrl({
        spanId,
        traceId,
      })}
      target="_blank"
      data-test-subj=""
    >
      {spanName}
    </EuiLink>
  );
};
