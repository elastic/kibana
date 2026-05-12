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
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core/public';
import { QUICK_ACTION_DEFINITIONS, type QuickActionDefinition } from './quick_action_definitions';

/** Management app link + Index Management feature (Elasticsearch) capabilities can diverge; show create-index card if either grants access. */
export function hasIndexManagementQuickActionCapability(
  capabilities: ApplicationStart['capabilities']
): boolean {
  if (Boolean(get(capabilities, 'management.data.index_management'))) {
    return true;
  }
  const indexManagementFeature = (capabilities as Record<string, unknown>).index_management;
  if (
    indexManagementFeature &&
    typeof indexManagementFeature === 'object' &&
    indexManagementFeature !== null &&
    !Array.isArray(indexManagementFeature)
  ) {
    return Object.values(indexManagementFeature as Record<string, boolean>).some((v) => v === true);
  }
  return false;
}

export const QuickActionsGrid = ({
  capabilities,
  navigateToApp,
}: {
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
}) => {
  const { euiTheme } = useEuiTheme();
  const quickActionCardTitleFont = useEuiFontSize('s');
  const visibleActions = useMemo(
    () =>
      QUICK_ACTION_DEFINITIONS.filter((action) => {
        if (action.id === 'create_index') {
          return hasIndexManagementQuickActionCapability(capabilities);
        }
        return Boolean(get(capabilities, action.capabilityPath));
      }),
    [capabilities]
  );

  const handleClick = useCallback(
    (action: QuickActionDefinition) => {
      navigateToApp(action.appId, { path: action.path });
    },
    [navigateToApp]
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

      <EuiFlexGrid
        columns={2}
        gutterSize="s"
        alignItems="stretch"
        data-test-subj="managementQuickActionsStack"
        css={css`
          width: 100%;
        `}
      >
        {visibleActions.map((action) => (
          <EuiFlexItem key={action.id}>
            <EuiCard
              css={css`
                width: 100%;
                height: 100%;
                .euiCard__title {
                  ${quickActionCardTitleFont}
                }
              `}
              hasBorder
              hasShadow={false}
              textAlign="left"
              title={action.title}
              titleElement="h3"
              titleSize="xs"
              onClick={() => handleClick(action)}
              data-test-subj={`managementQuickAction-${action.id}`}
            >
              <EuiText size="s" color="subdued">
                {action.description}
              </EuiText>
            </EuiCard>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
};
