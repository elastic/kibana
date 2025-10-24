/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPortal,
  EuiThemeProvider,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
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

type DragPosition = { top: number; left: number } | null;

const POSITION_STORAGE_KEY = 'kbn_developer_toolbar_minimized_position';

const getMinimizedToolbarStyles = (euiTheme: EuiThemeComputed, position: DragPosition) => [
  css`
    position: fixed;
    z-index: ${euiTheme.levels.toast};
  `,
  position
    ? css`
        top: ${position.top}px;
        left: ${position.left}px;
      `
    : css`
        bottom: ${euiTheme.size.s};
        left: ${euiTheme.size.s};
      `,
];

const getMinimizedContentStyles = (euiTheme: EuiThemeComputed) => css`
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
`;

const getMinimizedPanelStyles = (euiTheme: EuiThemeComputed) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border: none;
  box-shadow: none;
`;

const getExpandTilePanelStyles = (euiTheme: EuiThemeComputed) => css`
  background-color:rgb(11, 100, 221);
  border: none;
  box-shadow: none;
`;

const getDragIconStyles = (euiTheme: EuiThemeComputed) => css`
  width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: none;
  background: transparent;
  &:hover,
  &:focus,
  &:active {
    background: transparent;
    box-shadow: none;
  }
`;

// no-op

const getToolbarPanelStyles = (euiTheme: EuiThemeComputed) => css`
  border-radius: none;
  background-color:rgb(11, 100, 221);
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
  box-shadow: none; // ensure no top shadow line
`;

const getToolbarContainerStyles = (euiTheme: EuiThemeComputed) => [
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
  const state = useToolbarState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dragPosition, setDragPosition] = useState<DragPosition>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(POSITION_STORAGE_KEY) : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.top === 'number' &&
        typeof parsed.left === 'number' &&
        isFinite(parsed.top) &&
        isFinite(parsed.left)
      ) {
        return { top: parsed.top, left: parsed.left };
      }
    } catch {}
    return null;
  });
  const dragRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    elementStartLeft: number;
    elementStartTop: number;
    didDrag: boolean;
  } | null>(null);
  const prevIsMinimizedRef = useRef<boolean>(isMinimized);

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(
        // Notify parent to reserve space for the toolbar
        isMinimized ? 0 : HEIGHT
      );
    }
  }, [onHeightChange, isMinimized]);

  // Reset position to default when transitioning from expanded -> minimized
  useEffect(() => {
    if (prevIsMinimizedRef.current === false && isMinimized === true) {
      setDragPosition(null);
      try {
        window.localStorage.removeItem(POSITION_STORAGE_KEY);
      } catch {}
    }
    prevIsMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  useEffect(() => {
    const handleResize = () => {
      if (!dragRef.current || !dragPosition) return;
      const rect = dragRef.current.getBoundingClientRect();
      const clampedLeft = Math.max(0, Math.min(dragPosition.left, window.innerWidth - rect.width));
      const clampedTop = Math.max(0, Math.min(dragPosition.top, window.innerHeight - rect.height));
      if (clampedLeft !== dragPosition.left || clampedTop !== dragPosition.top) {
        const next = { top: clampedTop, left: clampedLeft };
        setDragPosition(next);
        try {
          window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dragPosition]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    dragStateRef.current = {
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      elementStartLeft: rect.left,
      elementStartTop: rect.top,
      didDrag: false,
    };

    const onMove = (e: PointerEvent) => {
      if (!dragStateRef.current || !dragRef.current) return;
      const deltaX = e.clientX - dragStateRef.current.startPointerX;
      const deltaY = e.clientY - dragStateRef.current.startPointerY;
      if (!dragStateRef.current.didDrag) {
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < 3) return;
        dragStateRef.current.didDrag = true;
      }
      const rectNow = dragRef.current.getBoundingClientRect();
      const width = rectNow.width;
      const height = rectNow.height;
      const nextLeft = Math.max(
        0,
        Math.min(dragStateRef.current.elementStartLeft + deltaX, window.innerWidth - width)
      );
      const nextTop = Math.max(
        0,
        Math.min(dragStateRef.current.elementStartTop + deltaY, window.innerHeight - height)
      );
      const next = { top: Math.round(nextTop), left: Math.round(nextLeft) };
      setDragPosition(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const didDrag = !!dragStateRef.current?.didDrag;
      const finalPosition = dragPosition;
      dragStateRef.current = null;
      if (didDrag && finalPosition) {
        try {
          window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(finalPosition));
        } catch {}
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true } as AddEventListenerOptions);
  };

  const onExpandClick = () => {
    if (dragStateRef.current && dragStateRef.current.didDrag) {
      return;
    }
    toggleMinimized();
  };

  if (isMinimized) {
    return (
      <EuiPortal>
        <div ref={dragRef} css={getMinimizedToolbarStyles(euiTheme, dragPosition)}>
          <EuiPanel paddingSize="none" hasShadow={false} hasBorder={false} css={[getMinimizedPanelStyles(euiTheme), getMinimizedContentStyles(euiTheme)]}>
            <EuiToolTip content="Drag" delay="regular">
              <EuiButtonIcon
                iconType="grabHorizontal"
                color="text"
                display="empty"
                size="s"
                onPointerDown={onPointerDown}
                aria-label="Drag developer toolbar"
                css={getDragIconStyles(euiTheme)}
              />
            </EuiToolTip>
            <EuiPanel paddingSize="none" hasShadow={false} hasBorder={false} css={getExpandTilePanelStyles(euiTheme)}>
              <EuiToolTip content="Expand developer toolbar" disableScreenReaderOutput={true}>
                <EuiButtonIcon
                  display={'empty'}
                  color={'text'}
                  iconType="expand"
                  size="s"
                  onClick={onExpandClick}
                  aria-label={'Expand developer toolbar'}
                />
              </EuiToolTip>
            </EuiPanel>
          </EuiPanel>
        </div>
      </EuiPortal>
    );
  }

  return (
    <div css={getToolbarContainerStyles(euiTheme)}>
      <EuiPanel css={getToolbarPanelStyles(euiTheme)}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Minimize">
                  <EuiButtonIcon
                    iconType="minimize"
                    size="xs"
                    color="text"
                    onClick={toggleMinimized}
                    aria-label="Minimize developer toolbar"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {state.isEnabled('errorsMonitor') && (
                <EuiFlexItem grow={false}>
                  <ConsoleErrorIndicator />
                </EuiFlexItem>
              )}
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
