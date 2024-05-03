/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAction } from '@reduxjs/toolkit';
import { FlyoutPanelProps } from '../..';

export enum ActionType {
  openFlyout = 'open_flyout',
  openRightPanel = 'open_right_panel',
  openLeftPanel = 'open_left_panel',
  openPreviewPanel = 'open_preview_panel',
  closeRightPanel = 'close_right_panel',
  closeLeftPanel = 'close_left_panel',
  closePreviewPanel = 'close_preview_panel',
  previousPreviewPanel = 'previous_preview_panel',
  closeFlyout = 'close_flyout',
  urlChanged = 'urlChanged',

  changePushVsOverlay = 'change_push_overlay',

  setDefaultWidths = 'set_default_widths',

  changeCollapsedWidth = 'change_collapsed_width',
  resetCollapsedWidth = 'reset_collapsed_width',
  changeExpandedWidth = 'change_expanded_width',
  resetExpandedWidth = 'reset_expanded_width',

  changeInternalPercentagesWidth = 'change_internal_percentages_width',
  resetInternalPercentagesWidth = 'reset_internal_percentages_width',
}

export const openPanelsAction = createAction<{
  /**
   * Panel to render in the right section
   */
  right?: FlyoutPanelProps;
  /**
   * Panel to render in the left section
   */
  left?: FlyoutPanelProps;
  /**
   * Panels to render in the preview section
   */
  preview?: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.openFlyout);

export const openRightPanelAction = createAction<{
  /**
   * Panel to render in the right section
   */
  right: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.openRightPanel);
export const openLeftPanelAction = createAction<{
  /**
   * Panel to render in the left section
   */
  left: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.openLeftPanel);
export const openPreviewPanelAction = createAction<{
  /**
   * Panels to render in the preview section
   */
  preview: FlyoutPanelProps;
  id: string;
}>(ActionType.openPreviewPanel);

export const closePanelsAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closeFlyout);
export const closeRightPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closeRightPanel);
export const closeLeftPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closeLeftPanel);
export const closePreviewPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.closePreviewPanel);

export const previousPreviewPanelAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.previousPreviewPanel);

export const urlChangedAction = createAction<{
  /**
   * Panel to render in the right section
   */
  right?: FlyoutPanelProps;
  /**
   * Panel to render in the left section
   */
  left?: FlyoutPanelProps;
  /**
   * Panels to render in the preview section
   */
  preview?: FlyoutPanelProps;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.urlChanged);

export const changePushVsOverlayAction = createAction<{
  /**
   *
   */
  type: 'push' | 'overlay';
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changePushVsOverlay);

export const setDefaultWidthsAction = createAction<{
  /**
   *
   */
  right: number;
  /**
   *
   */
  left: number;
  /**
   *
   */
  preview: number;
}>(ActionType.setDefaultWidths);

export const changeCollapsedWidthAction = createAction<{
  /**
   *
   */
  width: number;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeCollapsedWidth);

export const resetCollapsedWidthAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.resetCollapsedWidth);

export const changeExpandedWidthAction = createAction<{
  /**
   *
   */
  width: number;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeExpandedWidth);

export const resetExpandedWidthAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.resetExpandedWidth);

export const changeInternalPercentagesAction = createAction<{
  /**
   *
   */
  left: number;
  /**
   *
   */
  right: number;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeInternalPercentagesWidth);

export const resetInternalPercentagesAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.resetInternalPercentagesWidth);
