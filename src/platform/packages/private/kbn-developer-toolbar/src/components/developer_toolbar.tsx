/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useContext } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiThemeProvider,
  EuiToolTip,
  useEuiTheme,
  shade,
  isColorDark,
  hexToRgb,
  isValidHex,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ConsoleErrorIndicator } from '../indicators/console_error/console_error_indicator';
import { MemoryUsageIndicator } from '../indicators/memory/memory_usage_indicator';
import { FrameJankIndicator } from '../indicators/frame_jank/frame_jank_indicator';
import type { EnvironmentInfo } from '../indicators/environment/environment_indicator';
import { EnvironmentIndicator } from '../indicators/environment/environment_indicator';
import { useMinimized } from '../hooks/use_minimized';
import { SafeActionsPortal } from './safe_actions_portal';
import { SettingsModal } from './settings_modal';
import { DeveloperToolbarContext } from '../context/developer_toolbar_context';

export interface DeveloperToolbarProps {
  position?: 'fixed' | 'static';
  envInfo?: EnvironmentInfo;
  onHeightChange?: (height: number) => void;
}

const HEIGHT = 32;

const getMinimizedToolbarStyles = (euiTheme: EuiThemeComputed) => css`
  position: fixed;
  bottom: 4px;
  right: 16px;
  z-index: 9999;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
`;

const getToolbarPanelStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: 0;
  border-top: 1px solid ${euiTheme.colors.borderBaseAccentSecondary};
  background-color: ${euiTheme.colors.backgroundLightAccentSecondary};
`;

const getToolbarContainerStyles = (
  euiTheme: EuiThemeComputed,
  position: DeveloperToolbarProps['position']
) => [
  css`
    height: ${HEIGHT}px;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  `,
  position === 'fixed' &&
    css`
      position: fixed;
      bottom: 0;
      right: 0;
      left: 0;
      z-index: 9999;
    `,
];

export const DeveloperToolbar: React.FC<DeveloperToolbarProps> = (props) => {
  const context = useContext(DeveloperToolbarContext);
  const settings = context?.settings;
  const customBackgroundColor = settings?.customBackgroundColor;

  const colorMode = customBackgroundColor
    ? isColorDark(...hexToRgb(customBackgroundColor))
      ? 'dark'
      : 'light'
    : 'dark';

  return (
    <EuiThemeProvider colorMode={colorMode}>
      <DeveloperToolbarInternal {...props} />
    </EuiThemeProvider>
  );
};

const DeveloperToolbarInternal: React.FC<DeveloperToolbarProps> = ({
  envInfo,
  position = 'fixed',
  onHeightChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const { isMinimized, toggleMinimized } = useMinimized();
  const context = useContext(DeveloperToolbarContext);
  const settings = context?.settings;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const customBackgroundColor = settings?.customBackgroundColor;
  const customBorderColor = customBackgroundColor && shade(customBackgroundColor, 0.2);

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(
        // Notify parent to reserve space for the toolbar
        position === 'static' && !isMinimized ? HEIGHT : 0
      );
    }
  }, [onHeightChange, isMinimized, position]);

  if (isMinimized) {
    return (
      <div css={getMinimizedToolbarStyles(euiTheme)}>
        <EuiPanel paddingSize="xs" style={{ backgroundColor: customBackgroundColor }}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Expand developer toolbar" disableScreenReaderOutput={true}>
                <EuiButtonIcon
                  iconType="devToolsApp"
                  size="xs"
                  onClick={toggleMinimized}
                  aria-label={'Expand developer toolbar'}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    );
  }

  return (
    <div css={getToolbarContainerStyles(euiTheme, position)}>
      {settings?.consoleErrorsEnabled && <ConsoleErrorIndicator />}
      <EuiPanel
        paddingSize="xs"
        color="subdued"
        css={getToolbarPanelStyles(euiTheme)}
        style={{ backgroundColor: customBackgroundColor, borderTopColor: customBorderColor }}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {envInfo && settings?.environmentEnabled && (
                <EuiFlexItem grow={false}>
                  <EnvironmentIndicator
                    env={envInfo}
                    customLabel={settings.customEnvironmentLabel}
                  />
                </EuiFlexItem>
              )}

              {settings?.frameJankEnabled && (
                <EuiFlexItem grow={false}>
                  <FrameJankIndicator />
                </EuiFlexItem>
              )}

              {settings?.memoryUsageEnabled && (
                <EuiFlexItem grow={false}>
                  <MemoryUsageIndicator />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <SafeActionsPortal />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Settings">
                  <EuiButtonIcon
                    iconType="gear"
                    size="xs"
                    color="text"
                    onClick={() => setIsSettingsOpen(true)}
                    aria-label="Open developer toolbar settings"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Minimize">
                  <EuiButtonIcon
                    iconType="arrowDown"
                    size="xs"
                    color="text"
                    onClick={toggleMinimized}
                    aria-label="Minimize developer toolbar"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
