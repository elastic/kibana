/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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
import { MANAGEMENT_LANDING_SETTINGS_SHORTCUTS } from './management_landing_settings_definitions';

const DISMISS_STORAGE_KEY = 'managementLandingSettingsPanelDismissed';
/** Legacy key before the settings panel was renamed — still honored once to migrate dismiss state. */
const LEGACY_DISMISS_STORAGE_KEY = 'managementLandingZone3Dismissed';

function isSettingsPanelDismissed(): boolean {
  try {
    if (window.localStorage.getItem(DISMISS_STORAGE_KEY) === 'true') {
      return true;
    }
    if (window.localStorage.getItem(LEGACY_DISMISS_STORAGE_KEY) === 'true') {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function persistSettingsPanelDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
  } catch {
    // no-op
  }
}

export function ManagementLandingSettingsPanel({
  capabilities,
  navigateToApp,
}: {
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const { euiTheme } = useEuiTheme();
  const [dismissed, setDismissed] = useState(isSettingsPanelDismissed);

  const visibleRows = useMemo(
    () =>
      MANAGEMENT_LANDING_SETTINGS_SHORTCUTS.filter((row) =>
        Boolean(get(capabilities, row.capabilityPath))
      ),
    [capabilities]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      navigateToApp('management', { path });
    },
    [navigateToApp]
  );

  const handleDismiss = useCallback(() => {
    persistSettingsPanelDismissed();
    setDismissed(true);
  }, []);

  if (dismissed || visibleRows.length === 0) {
    return null;
  }

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      data-test-subj="managementLandingSettingsPanel"
      css={css`
        height: 100%;
        min-height: ${euiTheme.size.xl};
      `}
    >
      <EuiFlexGroup
        alignItems="flexStart"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={true}>
          <EuiText
            size="xs"
            css={css`
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <FormattedMessage
              id="management.landing.settingsPanel.kicker"
              defaultMessage="Settings"
            />
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiTitle size="xs">
            <h2
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              <FormattedMessage
                id="management.landing.settingsPanel.title"
                defaultMessage="Personalize your environment"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            display="empty"
            iconType="cross"
            onClick={handleDismiss}
            aria-label={i18n.translate('management.landing.settingsPanel.dismissAriaLabel', {
              defaultMessage: 'Dismiss settings teaser',
            })}
            data-test-subj="managementLandingSettingsPanelDismiss"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {visibleRows.map((row) => (
          <EuiFlexItem key={row.id} grow={false}>
            <div
              css={
                row.sectionBreakBefore
                  ? css`
                      margin-top: ${euiTheme.size.m};
                    `
                  : undefined
              }
            >
              <EuiCard
                css={css`
                  width: 100%;
                `}
                icon={<EuiIcon type={row.icon} size="l" />}
                title={row.title}
                titleSize="xs"
                layout="horizontal"
                onClick={() => handleNavigate(row.managementPath)}
                data-test-subj={`managementLandingSettingsPanelShortcut-${row.id}`}
              />
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
