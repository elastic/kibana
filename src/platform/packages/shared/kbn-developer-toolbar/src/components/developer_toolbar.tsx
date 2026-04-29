/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiThemeProvider,
  EuiToolTip,
  EuiWindowEvent,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isMac } from '@kbn/shared-ux-utility';
import { ConsoleErrorIndicator } from '../toolbar_items/console_error/console_error_indicator';
import { MemoryUsageIndicator } from '../toolbar_items/memory/memory_usage_indicator';
import { FrameJankIndicator } from '../toolbar_items/frame_jank/frame_jank_indicator';
import {
  EnvironmentIndicator,
  type EnvironmentInfo,
} from '../toolbar_items/environment/environment_indicator';
import { useMinimized } from '../hooks/use_minimized';
import { SettingsModal } from './settings_modal';
import { useToolbarState } from '../hooks/use_toolbar_state';

export interface DeveloperToolbarProps {
  envInfo?: EnvironmentInfo;
  onHeightChange?: (height: number) => void;
}

const HEIGHT = 32;
const TOOLBAR_BACKGROUND_COLOR = `rgb(11, 100, 221);`; // punchy blue

const getMinimizedToolbarStyles = (euiTheme: EuiThemeComputed) => css`
  position: fixed;
  bottom: ${euiTheme.size.xs};
  left: ${euiTheme.size.s};
  z-index: ${euiTheme.levels.toast};
  background-color: ${TOOLBAR_BACKGROUND_COLOR};
  border-radius: ${euiTheme.border.radius.medium};
`;

const getToolbarPanelStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: 0;
  background-color: ${TOOLBAR_BACKGROUND_COLOR};
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
`;

const getToolbarContainerStyles = (euiTheme: EuiThemeComputed) => [
  css`
    height: ${HEIGHT}px;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  `,
];

// --- Prototype controls (not for merge) ---
const miniButtonGroupCss = css`
  .euiButtonGroup__buttons {
    gap: 0;
    block-size: 22px;
  }
  .euiButtonGroup__button {
    min-width: auto;
    padding: 0 4px;
    font-size: 10px;
    height: 14px;
    line-height: 14px;
  }
  .euiButtonGroupButton > span {
    padding-inline: 4px;
  }
  .euiButtonGroupButton,
  .euiButtonGroupButton-isSelected {
    block-size: 16px;
  }
`;

function makeProtoControl<T extends string>(
  storageKey: string,
  eventName: string,
  defaultValue: T,
  read: () => T
) {
  return {
    storageKey,
    eventName,
    defaultValue,
    read,
    write: (value: T) => {
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event(eventName));
    },
    useValue: () => {
      const [v, setV] = useState<T>(read);
      useEffect(() => {
        const handler = () => setV(read());
        window.addEventListener(eventName, handler);
        return () => window.removeEventListener(eventName, handler);
      }, []);
      return v;
    },
  };
}

const PROTO_TITLE_SIZE_KEY = '__proto_app_menu_title_size';
const PROTO_TITLE_SIZE_EVENT = '__proto_app_menu_title_size_change';
const TITLE_SIZES = ['xxs', 'xs', 's'] as const;
type TitleSize = (typeof TITLE_SIZES)[number];
const TITLE_SIZE_DEFAULT: TitleSize = 'xs';
const titleSizeControl = makeProtoControl(
  PROTO_TITLE_SIZE_KEY,
  PROTO_TITLE_SIZE_EVENT,
  TITLE_SIZE_DEFAULT,
  () => {
    try {
      const v = localStorage.getItem(PROTO_TITLE_SIZE_KEY);
      if (v) return v as TitleSize;
    } catch {
      // ignore
    }
    return TITLE_SIZE_DEFAULT;
  }
);

const PROTO_HEADER_PADDING_KEY = '__proto_app_menu_header_padding_v2';
const PROTO_HEADER_PADDING_EVENT = '__proto_app_menu_header_padding_change';
const HEADER_PADDING_DEFAULT = '12';
const HEADER_PADDING_OPTIONS = ['8', '12', '16', '24'];

const PROTO_TAB_SIZE_KEY = '__proto_app_menu_tab_size_v2';
const PROTO_TAB_SIZE_EVENT = '__proto_app_menu_tab_size_change';
const TAB_SIZES = ['s', 'm'] as const;
type TabSize = (typeof TAB_SIZES)[number];
const TAB_SIZE_DEFAULT: TabSize = 'm';
const tabSizeControl = makeProtoControl(
  PROTO_TAB_SIZE_KEY,
  PROTO_TAB_SIZE_EVENT,
  TAB_SIZE_DEFAULT,
  () => {
    try {
      const v = localStorage.getItem(PROTO_TAB_SIZE_KEY);
      if (v) return v as TabSize;
    } catch {
      // ignore
    }
    return TAB_SIZE_DEFAULT;
  }
);
const headerPaddingControl = makeProtoControl(
  PROTO_HEADER_PADDING_KEY,
  PROTO_HEADER_PADDING_EVENT,
  HEADER_PADDING_DEFAULT,
  () => {
    try {
      const v = localStorage.getItem(PROTO_HEADER_PADDING_KEY);
      if (v) return v;
    } catch {
      // ignore
    }
    return HEADER_PADDING_DEFAULT;
  }
);

const TitleSizeControl: React.FC = () => {
  const selected = titleSizeControl.useValue();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <span style={{ fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Title</span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend="Title size"
          options={TITLE_SIZES.map((s) => ({ id: s, label: s }))}
          idSelected={selected}
          onChange={(id) => titleSizeControl.write(id as TitleSize)}
          buttonSize="compressed"
          css={miniButtonGroupCss}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const HeaderPaddingControl: React.FC = () => {
  const selected = headerPaddingControl.useValue();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <span style={{ fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Padding</span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend="Header padding"
          options={HEADER_PADDING_OPTIONS.map((s) => ({ id: s, label: `${s}px` }))}
          idSelected={selected}
          onChange={(id) => headerPaddingControl.write(id)}
          buttonSize="compressed"
          css={miniButtonGroupCss}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
const TabSizeControl: React.FC = () => {
  const selected = tabSizeControl.useValue();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <span style={{ fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Tabs</span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend="Tab size"
          options={TAB_SIZES.map((s) => ({ id: s, label: s }))}
          idSelected={selected}
          onChange={(id) => tabSizeControl.write(id as TabSize)}
          buttonSize="compressed"
          css={miniButtonGroupCss}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
const resetAllProtoControls = () => {
  titleSizeControl.write(TITLE_SIZE_DEFAULT);
  headerPaddingControl.write(HEADER_PADDING_DEFAULT);
  tabSizeControl.write(TAB_SIZE_DEFAULT);
};
// --- End prototype controls ---

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
      <EuiThemeProvider colorMode={'dark'}>
        <>{handleShortcut}</>
        <div css={getMinimizedToolbarStyles(euiTheme)}>
          <EuiToolTip
            content={
              <>
                Expand {keyboardShortcutLabel}
                <br />
                Right click to hide
              </>
            }
            disableScreenReaderOutput={true}
          >
            <EuiButtonIcon
              color={'text'}
              iconType="wrench"
              size="xs"
              onClick={toggleMinimized}
              onContextMenu={(e: React.MouseEvent) => {
                setIsHidden(true);
                e.preventDefault();
              }}
              aria-label={'Expand developer toolbar'}
            />
          </EuiToolTip>
        </div>
      </EuiThemeProvider>,
      document.body
    );
  }

  return (
    <div css={getToolbarContainerStyles(euiTheme)}>
      <>{handleShortcut}</>
      {state.isEnabled('errorsMonitor') && (
        <EuiThemeProvider colorMode={'light'}>
          <ConsoleErrorIndicator />
        </EuiThemeProvider>
      )}
      <EuiPanel css={getToolbarPanelStyles(euiTheme)} hasShadow={false} hasBorder={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={`Minimize ${keyboardShortcutLabel}`}>
                  <EuiButtonIcon
                    iconType="minimize"
                    size="xs"
                    color="text"
                    onClick={toggleMinimized}
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

              <EuiFlexItem grow={false}>
                <TitleSizeControl />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <HeaderPaddingControl />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <TabSizeControl />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiToolTip content="Reset all to defaults">
                  <EuiButtonIcon
                    iconType="refresh"
                    size="xs"
                    color="text"
                    onClick={resetAllProtoControls}
                    aria-label="Reset prototype controls to defaults"
                  />
                </EuiToolTip>
              </EuiFlexItem>
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
