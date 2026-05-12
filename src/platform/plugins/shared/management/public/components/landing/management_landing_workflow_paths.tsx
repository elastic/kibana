/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import type { ApplicationStart } from '@kbn/core/public';
import {
  MANAGEMENT_LANDING_WORKFLOW_PATH_FLOWS,
  type ManagementLandingWorkflowFlowDefinition,
  type ManagementLandingWorkflowLinkDefinition,
} from './management_landing_workflow_definitions';

function filterVisibleLinks(
  capabilities: ApplicationStart['capabilities'],
  flow: ManagementLandingWorkflowFlowDefinition
): ManagementLandingWorkflowLinkDefinition[] {
  return flow.links.filter((link) => {
    if (!link.capabilityPath) {
      return true;
    }
    return Boolean(get(capabilities, link.capabilityPath));
  });
}

export function ManagementLandingWorkflowPaths({
  capabilities,
  navigateToApp,
}: {
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const { euiTheme } = useEuiTheme();

  const flowsWithLinks = useMemo(() => {
    return MANAGEMENT_LANDING_WORKFLOW_PATH_FLOWS.map((flow) => ({
      flow,
      visibleLinks: filterVisibleLinks(capabilities, flow),
    })).filter((entry) => entry.visibleLinks.length > 0);
  }, [capabilities]);

  const handleActivateLink = useCallback(
    (link: ManagementLandingWorkflowLinkDefinition) => {
      navigateToApp('management', { path: link.managementPath });
    },
    [navigateToApp]
  );

  const handleStartTourPlanned = useCallback((_flowId: string) => {
    // Reserved for EuiTour — step through Management destinations for each workflow path.
  }, []);

  if (flowsWithLinks.length === 0) {
    return null;
  }

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      data-test-subj="managementLandingWorkflowPaths"
      css={css`
        width: 100%;
      `}
    >
      <EuiTitle size="xs">
        <h2
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          <FormattedMessage
            id="management.landing.workflowPaths.title"
            defaultMessage="Getting started"
          />
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        {flowsWithLinks.map(({ flow, visibleLinks }) => (
          <EuiFlexItem key={flow.id} grow={false}>
            <WorkflowFlowRow
              flow={flow}
              visibleLinks={visibleLinks}
              onActivateLink={handleActivateLink}
              onStartTour={handleStartTourPlanned}
              euiTheme={euiTheme}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function WorkflowFlowRow({
  flow,
  visibleLinks,
  onActivateLink,
  onStartTour,
  euiTheme,
}: {
  flow: ManagementLandingWorkflowFlowDefinition;
  visibleLinks: ManagementLandingWorkflowLinkDefinition[];
  onActivateLink: (link: ManagementLandingWorkflowLinkDefinition) => void;
  onStartTour: (flowId: string) => void;
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
}) {
  const startTourLabel = i18n.translate('management.landing.workflowPaths.startTour', {
    defaultMessage: 'Start a tour',
  });

  return (
    <EuiFlexGroup
      alignItems="flexStart"
      justifyContent="spaceBetween"
      responsive={true}
      gutterSize="m"
      wrap
      data-test-subj={`managementLandingWorkflowPathsFlow-${flow.id}`}
    >
      <EuiFlexItem
        grow={true}
        css={css`
          min-width: min(100%, ${euiTheme.breakpoint.s}px);
        `}
      >
        <EuiText size="s">
          <span css={css({ marginRight: euiTheme.size.xs })}>
            <strong>{flow.categoryTitle}</strong>
          </span>
          {visibleLinks.map((link, index) => (
            <React.Fragment key={link.id}>
              {index > 0 ? (
                <span
                  aria-hidden
                  css={css`
                    padding: 0 ${euiTheme.size.xs};
                  `}
                >
                  ·
                </span>
              ) : null}
              <EuiLink
                color="text"
                data-test-subj={`managementLandingWorkflowPathsLink-${flow.id}-${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onActivateLink(link);
                }}
              >
                {link.label}
              </EuiLink>
            </React.Fragment>
          ))}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          color="text"
          fill={false}
          size="s"
          data-test-subj={`managementLandingWorkflowPathsStartTour-${flow.id}`}
          onClick={() => onStartTour(flow.id)}
          aria-label={i18n.translate('management.landing.workflowPaths.startTourForFlow', {
            defaultMessage: 'Start a tour for {flowTitle}',
            values: { flowTitle: flow.categoryTitle },
          })}
        >
          {startTourLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
