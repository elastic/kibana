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
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core/public';
import type { LandingQuickActionOverlayRenderer } from '../../../types';
import { QUICK_ACTION_DEFINITIONS, type QuickActionDefinition } from './quick_action_definitions';

export const QuickActionsGrid = ({
  capabilities,
  navigateToApp,
  getLandingQuickActionOverlay,
  onOpenLandingOverlay,
}: {
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
  getLandingQuickActionOverlay?: (id: string) => LandingQuickActionOverlayRenderer | undefined;
  onOpenLandingOverlay: (overlayId: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const visibleActions = useMemo(
    () =>
      QUICK_ACTION_DEFINITIONS.filter((action) =>
        Boolean(get(capabilities, action.capabilityPath))
      ),
    [capabilities]
  );

  const handleClick = useCallback(
    (action: QuickActionDefinition) => {
      if (action.overlayId) {
        const render = getLandingQuickActionOverlay?.(action.overlayId);
        if (render) {
          onOpenLandingOverlay(action.overlayId);
          return;
        }
      }
      navigateToApp(action.appId, { path: action.path });
    },
    [getLandingQuickActionOverlay, navigateToApp, onOpenLandingOverlay]
  );

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      data-test-subj="managementQuickActionsGrid"
      css={css`
        height: 100%;
        min-height: ${euiTheme.size.xl};
      `}
    >
      <EuiTitle size="xs">
        <h2
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          <FormattedMessage
            id="management.landing.quickActions.title"
            defaultMessage="Quick actions"
          />
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <div
        css={css`
          width: 100%;
        `}
        data-test-subj="managementQuickActionsStack"
      >
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false} alignItems="stretch">
          {visibleActions.map((action) => (
            <EuiFlexItem key={action.id} grow={false}>
              <EuiCard
                css={css`
                  width: 100%;
                `}
                icon={<EuiIcon type={action.icon} size="l" aria-hidden />}
                title={action.title}
                titleSize="xs"
                layout="horizontal"
                onClick={() => handleClick(action)}
                data-test-subj={`managementQuickAction-${action.id}`}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
};
