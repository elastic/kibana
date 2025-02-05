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
import { AgentIcon } from '@kbn/custom-icons';
import { AgentName } from '@kbn/elastic-agent-utils';
import { getUnifiedDocViewerServices } from '../../../plugin';

const SERVICE_ENTITY_LOCATOR = 'SERVICE_ENTITY_LOCATOR';

interface ServiceNameLinkProps {
  serviceName: string;
  agentName: string;
}

export function ServiceNameLink({ serviceName, agentName }: ServiceNameLinkProps) {
  const {
    share: { url: urlService },
    core,
  } = getUnifiedDocViewerServices();

  const canViewApm = core.application.capabilities.apm?.show || false;

  const apmLinkToServiceEntityLocator = urlService.locators.get<{ serviceName: string }>(
    SERVICE_ENTITY_LOCATOR
  );
  const href = apmLinkToServiceEntityLocator?.getRedirectUrl({
    serviceName,
  });

  const routeLinkProps = href
    ? getRouterLinkProps({
        href,
        onClick: () => {
          // TODO add telemetry (https://github.com/elastic/kibana/issues/208919)
          apmLinkToServiceEntityLocator?.navigate({ serviceName });
        },
      })
    : undefined;

  const content = (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      {agentName && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName as AgentName} size="l" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText size="s">{serviceName}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {canViewApm && routeLinkProps ? (
        <EuiLink {...routeLinkProps} data-test-subj="unifiedDocViewTracesOverviewServiceNameLink">
          {content}
        </EuiLink>
      ) : (
        content
      )}
    </>
  );
}
