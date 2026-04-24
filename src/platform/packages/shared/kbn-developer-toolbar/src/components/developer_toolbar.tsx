/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiThemeProvider,
  EuiToolTip,
  EuiWindowEvent,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { isMac } from '@kbn/shared-ux-utility';
import { ConsoleErrorIndicator } from '../toolbar_items/console_error/console_error_indicator';
import type { ConsoleErrorInfo } from '../toolbar_items/console_error/console_monitor';
import { useConsoleErrorMonitor } from '../toolbar_items/console_error/use_console_error_monitor';
import {
  TOOLBAR_ERROR_COLOR,
  TOOLBAR_ERROR_GLOW_COLOR,
  TOOLBAR_WARNING_COLOR,
  TOOLBAR_WARNING_GLOW_COLOR,
} from '../toolbar_items/console_error/constants';
import { MemoryUsageIndicator } from '../toolbar_items/memory/memory_usage_indicator';
import { FrameJankIndicator } from '../toolbar_items/frame_jank/frame_jank_indicator';
import {
  EnvironmentIndicator,
  type EnvironmentInfo,
} from '../toolbar_items/environment/environment_indicator';
import { CloudEnvironmentToggle } from '../toolbar_items/cloud/cloud_environment_toggle';
import { useMinimized } from '../hooks/use_minimized';
import { SettingsModal } from './settings_modal';
import { useToolbarState } from '../hooks/use_toolbar_state';

export interface DeveloperToolbarProps {
  envInfo?: EnvironmentInfo;
  onHeightChange?: (height: number) => void;
}

const HEIGHT = 32;
const TOOLBAR_BACKGROUND_COLOR = 'rgb(11, 100, 221)'; // punchy blue

const ToolbarToggleTooltipContent: React.FC<{
  action: 'Expand' | 'Minimize';
  keyboardShortcutLabel: string;
  consoleError?: ConsoleErrorInfo | null;
}> = ({ action, keyboardShortcutLabel, consoleError }) => {
  return (
    <>
      {action} {keyboardShortcutLabel}
      {consoleError && (
        <>
          <br />
          {consoleError.type === 'error' ? 'Error' : 'Warning'}:{' '}
          {consoleError.message.trim().slice(0, 80)}
          {consoleError.message.trim().length > 80 ? '…' : ''}
        </>
      )}
      <br />
      Right click to hide
      <br />
      <em>developer_toolbar.enabled: false in kibana.dev.yml to disable</em>
    </>
  );
};

const minimizedAttentionPop = keyframes`
  0%   { transform: scale(1); }
  15%  { transform: scale(1.15); }
  70%  { transform: scale(0.97); }
  100% { transform: scale(1); }
`;

const getMinimizedToolbarGlowColor = (
  hasConsoleIssue: boolean,
  consoleError: ConsoleErrorInfo | null
): string | null => {
  if (!hasConsoleIssue || !consoleError) return null;
  return consoleError.type === 'error' ? TOOLBAR_ERROR_GLOW_COLOR : TOOLBAR_WARNING_GLOW_COLOR;
};

const getMinimizedToolbarStyles = (
  euiTheme: EuiThemeComputed,
  backgroundColor: string,
  shouldPop: boolean,
  glowColor: string | null
) => [
  css`
    position: fixed;
    bottom: ${euiTheme.size.xs};
    left: ${euiTheme.size.s};
    z-index: ${euiTheme.levels.toast};
    background-color: ${backgroundColor};
    border-radius: ${euiTheme.border.radius.medium};
    ${glowColor ? `box-shadow: 0 0 10px 3px ${glowColor};` : ''}
  `,
  shouldPop &&
    css`
      @media (prefers-reduced-motion: no-preference) {
        animation: ${minimizedAttentionPop} 450ms ease-out 0s 1;
      }
    `,
  css`
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
];

const getMinimizedToolbarBackgroundColor = (
  hasConsoleIssue: boolean,
  consoleError: ConsoleErrorInfo | null
): string => {
  if (!hasConsoleIssue || !consoleError) return TOOLBAR_BACKGROUND_COLOR;

  return consoleError.type === 'error' ? TOOLBAR_ERROR_COLOR : TOOLBAR_WARNING_COLOR;
};

const getMinimizedToolbarAriaLabel = (
  hasConsoleIssue: boolean,
  consoleError: ConsoleErrorInfo | null
): string => {
  if (!hasConsoleIssue || !consoleError) return 'Expand developer toolbar';

  return consoleError.type === 'error'
    ? 'Expand developer toolbar (console error detected)'
    : 'Expand developer toolbar (console warning detected)';
};

const getMinimizedToolbarAttentionKey = (
  hasConsoleIssue: boolean,
  consoleError: ConsoleErrorInfo | null
): string => {
  if (!hasConsoleIssue || !consoleError) return 'no-console-issue';
  return `${consoleError.type}:${consoleError.message}`;
};

interface MinimizedDeveloperToolbarButtonProps {
  keyboardShortcutLabel: string;
  isErrorsMonitorEnabled: boolean;
  consoleError: ConsoleErrorInfo | null;
  onExpand: () => void;
  onHide: () => void;
}

const MinimizedDeveloperToolbarButtonInner: React.FC<
  MinimizedDeveloperToolbarButtonProps & { hasConsoleIssue: boolean }
> = ({ keyboardShortcutLabel, hasConsoleIssue, consoleError, onExpand, onHide }) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const backgroundColor = getMinimizedToolbarBackgroundColor(hasConsoleIssue, consoleError);
  const ariaLabel = getMinimizedToolbarAriaLabel(hasConsoleIssue, consoleError);
  const shouldPop = hasConsoleIssue;
  const glowColor = getMinimizedToolbarGlowColor(hasConsoleIssue, consoleError);
  const attentionKey = getMinimizedToolbarAttentionKey(hasConsoleIssue, consoleError);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasConsoleIssue) return;
    el.style.animationName = 'none';
    void el.offsetHeight; // force reflow to reset animation state
    el.style.animationName = '';
  }, [attentionKey, hasConsoleIssue]);

  return (
    <div
      ref={containerRef}
      css={getMinimizedToolbarStyles(euiTheme, backgroundColor, shouldPop, glowColor)}
    >
      <EuiToolTip
        content={
          <ToolbarToggleTooltipContent
            action="Expand"
            keyboardShortcutLabel={keyboardShortcutLabel}
            consoleError={consoleError}
          />
        }
        disableScreenReaderOutput={true}
      >
        <EuiButtonIcon
          color="text"
          iconType="wrench"
          size="xs"
          onClick={onExpand}
          onContextMenu={(e: React.MouseEvent) => {
            onHide();
            e.preventDefault();
          }}
          aria-label={ariaLabel}
        />
      </EuiToolTip>
    </div>
  );
};

const MinimizedDeveloperToolbarButton: React.FC<MinimizedDeveloperToolbarButtonProps> = (props) => {
  const hasConsoleIssue = props.isErrorsMonitorEnabled && props.consoleError != null;

  return (
    <EuiThemeProvider colorMode="dark">
      <MinimizedDeveloperToolbarButtonInner {...props} hasConsoleIssue={hasConsoleIssue} />
    </EuiThemeProvider>
  );
};

const getToolbarPanelStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: 0;
  background-color: ${TOOLBAR_BACKGROUND_COLOR};
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
`;

const getToolbarContainerStyles = () => [
  css`
    height: ${HEIGHT}px;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  `,
];

export const DeveloperToolbar: React.FC<DeveloperToolbarProps> = (props) => {
  return (
    <EuiThemeProvider colorMode={'dark'}>
      <DeveloperToolbarInternal {...props} />
    </EuiThemeProvider>
  );
};

const DeveloperToolbarInternal: React.FC<DeveloperToolbarProps> = ({ envInfo, onHeightChange }) => {
  const { euiTheme } = useEuiTheme();
  const { isMinimized, toggleMinimized } = useMinimized();
  const [isHidden, setIsHidden] = useState(false);
  const state = useToolbarState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const keyboardShortcutLabel = isMac ? '⌘+\\' : 'Ctrl+\\';

  const isErrorsMonitorEnabled = state.isEnabled('errorsMonitor');
  const {
    error: consoleError,
    errorCount: consoleErrorCount,
    dismiss: dismissConsoleError,
  } = useConsoleErrorMonitor(isErrorsMonitorEnabled);

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(
        // Notify parent to reserve space for the toolbar
        isMinimized ? 0 : HEIGHT
      );
    }
  }, [onHeightChange, isMinimized]);

  const handleShortcut = (
    <EuiWindowEvent
      event="keydown"
      handler={(e) => {
        if (isToggleShortcut(e)) {
          e.preventDefault();
          setIsHidden(false);
          toggleMinimized();
        }
      }}
    />
  );

  if (isHidden) return <>{handleShortcut}</>;

  if (isMinimized) {
    return ReactDOM.createPortal(
      <>
        {handleShortcut}
        <MinimizedDeveloperToolbarButton
          keyboardShortcutLabel={keyboardShortcutLabel}
          isErrorsMonitorEnabled={isErrorsMonitorEnabled}
          consoleError={consoleError}
          onExpand={toggleMinimized}
          onHide={() => setIsHidden(true)}
        />
      </>,
      document.body
    );
  }

  return (
    <div css={getToolbarContainerStyles()}>
      <>{handleShortcut}</>
      {state.isEnabled('errorsMonitor') && (
        <EuiThemeProvider colorMode="light">
          <ConsoleErrorIndicator
            error={consoleError}
            errorCount={consoleErrorCount}
            onDismiss={dismissConsoleError}
          />
        </EuiThemeProvider>
      )}
      <EuiPanel css={getToolbarPanelStyles(euiTheme)} hasShadow={false} hasBorder={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <ToolbarToggleTooltipContent
                      action="Minimize"
                      keyboardShortcutLabel={keyboardShortcutLabel}
                    />
                  }
                >
                  <EuiButtonIcon
                    iconType="minimize"
                    size="xs"
                    color="text"
                    onClick={toggleMinimized}
                    onContextMenu={(e: React.MouseEvent) => {
                      setIsHidden(true);
                      e.preventDefault();
                    }}
                    aria-label="Minimize developer toolbar"
                  />
                </EuiToolTip>
              </EuiFlexItem>

              {envInfo && state.isEnabled('environmentInfo') && (
                <EuiFlexItem grow={false}>
                  <EnvironmentIndicator env={envInfo} />
                </EuiFlexItem>
              )}

              {state.isEnabled('frameJank') && (
                <EuiFlexItem grow={false}>
                  <FrameJankIndicator />
                </EuiFlexItem>
              )}

              {state.isEnabled('memoryMonitor') && (
                <EuiFlexItem grow={false}>
                  <MemoryUsageIndicator />
                </EuiFlexItem>
              )}

              {state.isEnabled('cloudEnvironment') && (
                <EuiFlexItem grow={false}>
                  <CloudEnvironmentToggle />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
            css={css`
              // Make sure the list of right-aligned items can scroll if necessary
              min-width: 0;
            `}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {state.enabledItems.length > 0 && (
                <EuiFlexItem
                  grow={false}
                  css={css`
                    // Make sure the list of right-aligned items can scroll if necessary
                    min-width: 0;
                  `}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`
                      // make these items scrollable if they overflow the container
                      overflow-x: auto;
                      // prevent scrollbar from taking up space
                      scrollbar-width: none;
                    `}
                  >
                    {state.enabledItems.map((item) => (
                      <EuiFlexItem key={item.id} grow={false}>
                        {item.children}
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}

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
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

// CMD + \ or CTRL + \ keyboard shortcut to toggle the developer toolbar
const isToggleShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && event.key === '\\';
