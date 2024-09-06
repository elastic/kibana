/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { HighlightField, HighlightFieldProps } from './highlight_field';
import { useLogsOverviewContext } from '../../../hooks/use_logs_overview_provider';
import { getUnifiedDocViewerServices } from '../../../plugin';

const APM_LINK_TO_SERVICE_ENTITY_LOCATOR = 'APM_LINK_TO_SERVICE_ENTITY_LOCATOR';

export function ServiceNameHighlightField(props: HighlightFieldProps) {
  const { share } = getUnifiedDocViewerServices();
  const { url: urlService } = share;
  const apmLinkToServiceEntityLocator = urlService.locators.get<{ serviceName: string }>(
    APM_LINK_TO_SERVICE_ENTITY_LOCATOR
  );
  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    serviceName: props.value as string,
  });
  const { isEntityManagerEnabled } = useLogsOverviewContext();

  return (
    <HighlightField {...props}>
      {isEntityManagerEnabled
        ? ({ content }) => <EuiLink href={href}>{content}</EuiLink>
        : undefined}
    </HighlightField>
  );
}
