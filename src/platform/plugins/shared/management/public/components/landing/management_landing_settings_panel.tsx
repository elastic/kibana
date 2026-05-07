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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import type { ApplicationStart } from '@kbn/core/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { MANAGEMENT_LANDING_SETTINGS_ROWS } from './management_landing_settings_definitions';
import {
  ManagementLandingNavigateSettingsRow,
  ManagementLandingUiSettingRow,
} from './management_landing_settings_inline_controls';

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
  uiSettings,
}: {
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
  uiSettings: IUiSettingsClient;
}) {
  const { euiTheme } = useEuiTheme();
  const [dismissed, setDismissed] = useState(isSettingsPanelDismissed);

  const visibleRows = useMemo(
    () =>
      MANAGEMENT_LANDING_SETTINGS_ROWS.filter((row) =>
        Boolean(get(capabilities, row.capabilityPath))
      ),
    [capabilities]
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

      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        {visibleRows.map((row) => (
          <EuiFlexItem key={row.id} grow={false}>
            <div
              css={
                row.sectionBreakBefore
                  ? css`
                      padding-top: ${euiTheme.size.m};
                      border-top: ${euiTheme.border.thin};
                    `
                  : undefined
              }
            >
              {row.kind === 'navigate' ? (
                <ManagementLandingNavigateSettingsRow row={row} navigateToApp={navigateToApp} />
              ) : (
                <ManagementLandingUiSettingRow row={row} uiSettings={uiSettings} />
              )}
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
