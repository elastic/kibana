/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAction } from '@reduxjs/toolkit';
import { FlyoutPanelProps } from './types';

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
}

export const openPanelsAction = createAction<{
  right?: FlyoutPanelProps;
  left?: FlyoutPanelProps;
  preview?: FlyoutPanelProps;
}>(ActionType.openFlyout);

export const openRightPanelAction = createAction<FlyoutPanelProps>(ActionType.openRightPanel);
export const openLeftPanelAction = createAction<FlyoutPanelProps>(ActionType.openLeftPanel);
export const openPreviewPanelAction = createAction<FlyoutPanelProps>(ActionType.openPreviewPanel);

export const closePanelsAction = createAction(ActionType.closeFlyout);
export const closeRightPanelAction = createAction(ActionType.closeRightPanel);
export const closeLeftPanelAction = createAction(ActionType.closeLeftPanel);
export const closePreviewPanelAction = createAction(ActionType.closePreviewPanel);

export const previousPreviewPanelAction = createAction(ActionType.previousPreviewPanel);

export const urlChangedAction = createAction<{
  right?: FlyoutPanelProps;
  left?: FlyoutPanelProps;
  preview?: FlyoutPanelProps;
}>(ActionType.urlChanged);
