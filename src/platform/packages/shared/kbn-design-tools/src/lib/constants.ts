/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MEASURE_OVERLAY_ID = 'measureOverlay';
export const EDIT_OVERLAY_ID = 'editOverlay';
export const LAYOUT_OVERLAY_ID = 'layoutOverlayContainer';
export const LAYOUT_SETTINGS_FLYOUT_ID = 'layoutSettingsFlyout';
export const DEVELOPER_TOOLBAR_ID = 'developerToolbar';
export const ENDPOINT_SIZE = 5;
export const LABEL_PADDING = 4;

export const DEVTOOL_CLONE_ATTR = 'data-devtool-clone';
export const DEVTOOL_IGNORE_ATTR = 'data-devtool-ignore';
export const DEVTOOL_RESIZE_HANDLE_ATTR = 'data-devtool-resize-handle';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export const RESIZE_HANDLE_SIZE = 8;

/** Cursor for each resize handle. */
export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};
