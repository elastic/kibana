/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useEffect } from 'react';

import type { WorkspaceSidebarApp } from '@kbn/core-workspace-chrome-state';
import {
  useIsSidebarOpen,
  useCurrentSidebarApp,
  closeSidebar,
  useWorkspaceDispatch,
  setSidebarWidth,
  setSidebarFullscreen,
  useIsSidebarFullSize,
  useSidebarWidth,
  useNavigationWidth,
  getSidebarWidth,
} from '@kbn/core-workspace-chrome-state';

import {
  WorkspaceSidebarPanelComponent,
  type WorkspaceSidebarPanelComponentProps,
} from './workspace_sidebar_panel.component';

import { WorkspaceSidebarPanelLoading } from './panel_loading';

// Constants for sidebar resizing behavior
const MIN_SIDEBAR_WIDTH = 320;
// const MAX_SIDEBAR_WIDTH = 40% of application space;

export interface WorkspaceSidebarPanelProps
  extends Omit<
    WorkspaceSidebarPanelComponentProps,
    'onClose' | 'title' | 'children' | 'onSetFullSize' | 'isFullSize'
  > {
  apps: WorkspaceSidebarApp[];
}

export const WorkspaceSidebarPanel = ({ apps }: WorkspaceSidebarPanelProps) => {
  const dispatch = useWorkspaceDispatch();

  const isSidebarOpen = useIsSidebarOpen();
  const isFullSize = useIsSidebarFullSize();
  const currentApp = useCurrentSidebarApp();
  const sidebarWidth = useSidebarWidth();
  const navigationWidth = useNavigationWidth();

  // Track current width during dragging to avoid async state issues
  const currentWidthRef = useRef<number>(sidebarWidth || 0);

  // Update ref when sidebarWidth changes (e.g., when sidebar opens)
  useEffect(() => {
    if (sidebarWidth) {
      currentWidthRef.current = sidebarWidth;
    }
  }, [sidebarWidth]);

  const onClose = () => {
    dispatch(closeSidebar());
    dispatch(setSidebarFullscreen(false));
  };

  const onSetFullSize = useCallback(
    (value: boolean) => {
      dispatch(setSidebarFullscreen(value));
    },
    [dispatch]
  );

  const definition = apps.find((t) => t.appId === currentApp);

  const onResize = useCallback(
    (delta: number): void => {
      // If currently in fullscreen, exit fullscreen and set a fixed width
      if (isFullSize) {
        dispatch(setSidebarFullscreen(false));

        // Set to a fixed width (400px) when exiting fullscreen
        const newWidth = getSidebarWidth(definition?.size || 'regular');
        currentWidthRef.current = newWidth;
        dispatch(setSidebarWidth(newWidth));
        return;
      }

      // Normal resize logic - apply delta with sticky constraints
      const currentWidth = currentWidthRef.current;
      const newWidth = currentWidth + delta;

      // Calculate max width as half of available window width
      const totalWindowWidth = window.innerWidth;
      const availableWidth = totalWindowWidth - navigationWidth - 8; // 8px for margins
      const maxWidth = availableWidth * 0.4;

      // Apply normal constraints - clamp the width between min and max
      const finalWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, maxWidth));

      currentWidthRef.current = finalWidth;
      dispatch(setSidebarWidth(finalWidth));
    },
    [dispatch, isFullSize, navigationWidth, definition?.size]
  );

  const onResizeStart = useCallback((): void => {
    if (isFullSize) {
      dispatch(setSidebarFullscreen(false));
    }

    // Initialize the ref with the current sidebar width when resize starts
    if (sidebarWidth) {
      currentWidthRef.current = sidebarWidth;
    }
  }, [sidebarWidth, dispatch, isFullSize]);

  const onResizeEnd = useCallback((): void => {
    // Apply both min and max width constraints
    const currentWidth = currentWidthRef.current;

    // Calculate max width as half of available window width
    const totalWindowWidth = window.innerWidth;
    const availableWidth = totalWindowWidth - navigationWidth - 8; // 8px for margins
    const maxWidth = availableWidth * 0.5; // 50% of available width

    const constrainedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(currentWidth, maxWidth));

    if (constrainedWidth !== currentWidth) {
      currentWidthRef.current = constrainedWidth;
      dispatch(setSidebarWidth(constrainedWidth));
    }
  }, [dispatch, navigationWidth]);

  if (!sidebarWidth) {
    return null;
  }

  if (!definition) {
    if (isSidebarOpen) {
      return <WorkspaceSidebarPanelLoading />;
    }

    return null;
  }

  const { app } = definition;

  return (
    <WorkspaceSidebarPanelComponent
      {...{
        onClose,
        onResize,
        onResizeStart,
        onResizeEnd,
        onSetFullSize,
        isFullSize,
        ...app,
      }}
    />
  );
};
