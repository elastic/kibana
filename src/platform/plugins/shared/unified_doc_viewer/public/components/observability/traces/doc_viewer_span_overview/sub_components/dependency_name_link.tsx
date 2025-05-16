/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import { DEPENDENCY_OVERVIEW_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

interface DependencyNameLinkProps {
  dependencyName: string;
  environment: string;
}

export function DependencyNameLink({ dependencyName, environment }: DependencyNameLinkProps) {
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
        <EuiText size="xs">{dependencyName}</EuiText>
      </EuiFlexItem>
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
