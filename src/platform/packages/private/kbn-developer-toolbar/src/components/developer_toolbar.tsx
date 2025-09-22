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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ConsoleErrorIndicator } from '../indicators/console_error/console_error_indicator';
import { MemoryUsageIndicator } from '../indicators/memory/memory_usage_indicator';
import { FrameJankIndicator } from '../indicators/frame_jank/frame_jank_indicator';
import type { EnvironmentInfo } from '../indicators/environment/environment_indicator';
import { EnvironmentIndicator } from '../indicators/environment/environment_indicator';
import { useMinimized } from '../hooks/use_minimized';
import { CustomItemsPortal } from './custom_items_portal';
import { SettingsModal } from './settings_modal';
import { DeveloperToolbarContext } from '../context/developer_toolbar_context';

export interface DeveloperToolbarProps {
  envInfo?: EnvironmentInfo;
  onHeightChange?: (height: number) => void;
}

const HEIGHT = 32;

const getMinimizedToolbarStyles = (euiTheme: EuiThemeComputed) => css`
  position: fixed;
  bottom: 4px;
  right: 16px;
  z-index: 9999;
`;

const getToolbarPanelStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: 0;
  border-top: 1px solid ${euiTheme.colors.borderBaseAccentSecondary};
  background-color: ${euiTheme.colors.backgroundLightAccentSecondary};
`;

const getToolbarContainerStyles = (euiTheme: EuiThemeComputed) => [
  css`
    height: ${HEIGHT}px;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
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

const DeveloperToolbarInternal: React.FC<DeveloperToolbarProps> = ({ envInfo, onHeightChange }) => {
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
        isMinimized ? 0 : HEIGHT
      );
    }
  }, [onHeightChange, isMinimized]);

  if (isMinimized) {
    return (
      <div css={getMinimizedToolbarStyles(euiTheme)}>
        <EuiToolTip content="Expand developer toolbar" disableScreenReaderOutput={true}>
          <EuiButtonIcon
            display={'fill'}
            color={'accentSecondary'}
            iconType="devToolsApp"
            size="xs"
            onClick={toggleMinimized}
            aria-label={'Expand developer toolbar'}
          />
        </EuiToolTip>
      </div>
    );
  }

  return (
    <div css={getToolbarContainerStyles(euiTheme)}>
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
                <CustomItemsPortal />
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
