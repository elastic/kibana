/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import { AgentIcon } from '@kbn/custom-icons';
import { AgentName } from '@kbn/elastic-agent-utils';
import { getUnifiedDocViewerServices } from '../../../../plugin';

const SERVICE_OVERVIEW_LOCATOR_ID = 'serviceOverviewLocator';

interface ServiceNameLinkProps {
  serviceName: string;
  agentName: string;
  formattedServiceName: React.ReactNode;
}

export function ServiceNameLink({
  serviceName,
  agentName,
  formattedServiceName,
}: ServiceNameLinkProps) {
  const {
    share: { url: urlService },
    core,
    data: dataService,
  } = getUnifiedDocViewerServices();

  const canViewApm = core.application.capabilities.apm?.show || false;
  const { from: timeRangeFrom, to: timeRangeTo } =
    dataService.query.timefilter.timefilter.getTime();

  const apmLinkToServiceEntityLocator = urlService.locators.get<{
    serviceName: string;
    rangeFrom: string;
    rangeTo: string;
  }>(SERVICE_OVERVIEW_LOCATOR_ID);

  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    serviceName,
    rangeFrom: timeRangeFrom,
    rangeTo: timeRangeTo,
  });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => {
          apmLinkToServiceEntityLocator?.navigate({
            serviceName,
            rangeFrom: timeRangeFrom,
            rangeTo: timeRangeTo,
          });
        },
      })
    : undefined;

  const content = (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      {agentName && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName as AgentName} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>{formattedServiceName}</EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {canViewApm && routeLinkProps ? (
        <EuiLink
          {...routeLinkProps}
          data-test-subj="unifiedDocViewerObservabilityTracesServiceNameLink"
        >
          {content}
        </EuiLink>
      ) : (
        content
      )}
    </>
  );
}
