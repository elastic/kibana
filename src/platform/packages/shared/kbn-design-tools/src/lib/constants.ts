/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Root container for the measure (spacing inspection) overlay. */
export const MEASURE_OVERLAY_ID = 'measureOverlay';

/** Root container for the edit (drag/resize) overlay. */
export const EDIT_OVERLAY_ID = 'editOverlay';

/** Root container for the layout grid/column overlay. */
export const LAYOUT_OVERLAY_ID = 'layoutOverlayContainer';

/** EUI flyout panel for layout settings. */
export const LAYOUT_SETTINGS_FLYOUT_ID = 'layoutSettingsFlyout';

/** EUI context-menu popover attached to the layout button. */
export const LAYOUT_POPOVER_ID = 'layoutPopover';

/** The edit-element modal dialog. */
export const EDIT_MODAL_ID = 'editModal';

/** The fixed toolbar rendered at the bottom of the viewport. */
export const DEVELOPER_TOOLBAR_ID = 'developerToolbar';

/** Radius (px) of spacing-line endpoint circles. */
export const ENDPOINT_SIZE = 5;

/** Padding (px) inside measurement value labels. */
export const LABEL_PADDING = 4;

/** Marks a managed element owned by the edit overlay. */
export const DEVTOOL_MANAGED_ATTR = 'data-devtool-managed';

/** Marks an original element hidden by the edit overlay. Stores the original inline transform. */
export const DEVTOOL_HIDDEN_ATTR = 'data-devtool-hidden';

/** Marks an element that should be excluded from measurement/selection. */
export const DEVTOOL_IGNORE_ATTR = 'data-devtool-ignore';

/** Marks a resize handle element within an edit outline. */
export const DEVTOOL_RESIZE_HANDLE_ATTR = 'data-devtool-resize-handle';

/** Cardinal and ordinal resize handle positions. */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** All eight resize handle positions in clockwise order starting top-left. */
export const ALL_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Width/height (px) of each resize handle hit-target. */
export const RESIZE_HANDLE_SIZE = 8;

/** Minimum element dimension (px) below which no resize handles are shown. */
export const MIN_HANDLE_DIM = 24;

/** Minimum element dimension (px) for showing all 8 resize handles. */
export const FULL_HANDLE_DIM = 64;

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

/** Tags that cannot be deleted via the edit overlay. */
export const NON_DELETABLE_TAGS = ['BODY', 'HTML'];

/** EUI truncation classes that use !important and must be stripped from clones. */
export const TRUNCATION_CLASSES = ['eui-textTruncate', 'eui-textBreakWord', 'eui-textBreakAll'];

/** Class name substrings for purely structural components (e.g. euiSpacer). */
export const IGNORED_CLASS_LABELS = ['euiSpacer'];

/** Class name prefixes for structural/chrome elements that should always be ignored. */
export const IGNORED_CLASS_PREFIXES = ['kbnChromeLayout'];

/** Height of the edit controls panel below a selected element. */
export const CONTROLS_HEIGHT = 40;

/** Padding around the hover-lock bounds. */
export const LOCK_PADDING = 12;

/** Pixel offset applied to duplicated elements so they don't overlap the source. */
export const DUPLICATE_OFFSET = 20;

/** Minimum border-radius (px) to consider an element "rounded". */
export const ROUNDING_THRESHOLD = 4;

/** Width (px) of the edge zone where dead-zone compensation applies. */
export const EDGE_ZONE = 16;

/** SVG child element tag names that are not meaningful to show in UI trees. */
export const SVG_INTERNALS = new Set([
  'path',
  'g',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'text',
  'tspan',
  'defs',
  'clippath',
  'mask',
  'use',
  'symbol',
  'lineargradient',
  'radialgradient',
  'stop',
  'filter',
  'feblend',
  'fecolormatrix',
  'fecomponenttransfer',
  'fecomposite',
  'feconvolvematrix',
  'fediffuselighting',
  'fedisplacementmap',
  'feflood',
  'fegaussianblur',
  'feimage',
  'femerge',
  'femorphology',
  'feoffset',
  'fespecularlighting',
  'fetile',
  'feturbulence',
]);
