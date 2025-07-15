/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { ServiceNameWithIcon } from './service_name_with_icon';

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
    <ServiceNameWithIcon agentName={agentName} formattedServiceName={formattedServiceName} />
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
