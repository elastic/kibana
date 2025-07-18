/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { DEPENDENCY_OVERVIEW_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { SpanIcon } from '@kbn/apm-ui-shared';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

interface DependencyNameLinkProps {
  dependencyName: string;
  spanType?: string;
  spanSubtype?: string;
  environment: string;
  formattedDependencyName?: React.ReactNode;
}

export function DependencyNameLink({
  dependencyName,
  spanType,
  spanSubtype,
  environment,
  formattedDependencyName,
}: DependencyNameLinkProps) {
  const {
    share: { url: urlService },
    core,
    data: dataService,
  } = getUnifiedDocViewerServices();

  const canViewApm = core.application.capabilities.apm?.show || false;
  const { from: timeRangeFrom, to: timeRangeTo } =
    dataService.query.timefilter.timefilter.getTime();

  const apmLinkToDependencyOverviewLocator = urlService.locators.get<{
    dependencyName: string;
    environment: string;
    rangeFrom: string;
    rangeTo: string;
  }>(DEPENDENCY_OVERVIEW_LOCATOR_ID);

  const href = apmLinkToDependencyOverviewLocator?.getRedirectUrl({
    dependencyName,
    environment,
    rangeFrom: timeRangeFrom,
    rangeTo: timeRangeTo,
  });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => {
          apmLinkToDependencyOverviewLocator?.navigate({
            dependencyName,
            environment,
            rangeFrom: timeRangeFrom,
            rangeTo: timeRangeTo,
          });
        },
      })
    : undefined;

  const content = (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem>
        <SpanIcon type={spanType} subtype={spanSubtype} size="m" />
      </EuiFlexItem>
      <EuiFlexItem>{formattedDependencyName}</EuiFlexItem>
    </EuiFlexGroup>
  );

  return canViewApm && routeLinkProps ? (
    <EuiLink {...routeLinkProps} data-test-subj="unifiedDocViewSpanOverviewDependencyNameLink">
      {content}
    </EuiLink>
  ) : (
    content
  );
}
