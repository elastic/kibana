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

/** Height in pixels of the developer toolbar when visible. */
export const DEVELOPER_TOOLBAR_HEIGHT = 32;

/** Radius (px) of spacing-line endpoint circles. */
export const ENDPOINT_SIZE = 5;

/** Padding (px) inside measurement value labels. */
export const LABEL_PADDING = 4;

/** Marks a managed element owned by the edit overlay. */
export const DEVTOOL_MANAGED_ATTR = 'data-devtool-managed';

/** Marks a managed element owned by the edit overlay. Also indicates the element is a live React component that can be re-rendered in-place. */
export const DEVTOOL_LIVE_ATTR = 'data-devtool-live';

/** Stores the EUI library ID on an inserted element (e.g. "Switch/Regular") for export/import. */
export const DEVTOOL_LIBRARY_ID_ATTR = 'data-devtool-library-id';

/** Marks an original element hidden by the edit overlay. Stores the original inline transform. */
export const DEVTOOL_HIDDEN_ATTR = 'data-devtool-hidden';

/** Marks a managed clone descendant that must remain hidden in clone/preview trees. */
export const DEVTOOL_CLONE_HIDDEN_ATTR = 'data-clone-hidden';

/** Marks an element that should be excluded from measurement/selection. */
export const DEVTOOL_IGNORE_ATTR = 'data-devtool-ignore';

/** Marks the injected `<style>` element containing `--dt-*` CSS custom properties. */
export const DEVTOOL_TOKEN_VARS_ATTR = 'data-devtool-token-vars';

/** Prefix for CSS custom properties managed by the design tools (e.g. `--dt-textParagraph`). */
export const CSS_VAR_PREFIX = '--dt-';

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

/** EUI Card root class. */
export const EUI_CARD_ROOT_CLASS = 'euiCard';

/** EUI Card image wrapper class whose width and offsets depend on card padding. */
export const EUI_CARD_IMAGE_CLASS = 'euiCard__image';

/** EUI Card icon class used when an icon overlays the card image. */
export const EUI_CARD_ICON_CLASS = 'euiCard__icon';

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

/** Maximum recursion depth when traversing DOM trees (clone, unfreeze, flatten). */
export const MAX_TREE_DEPTH = 50;

/** Maximum number of transactions kept in the undo/redo history stack. */
export const MAX_UNDO_ENTRIES = 500;

/**
 * Fallback z-index used when importing/restoring elements outside of a
 * React context (where `useOverlayZIndex` is unavailable).
 */
export const IMPORT_CLONE_Z_INDEX = 9001;

/** Width (px) of the edge zone where dead-zone compensation applies. */
export const EDGE_ZONE = 16;

/** Prefix used for generated pseudo-element class names on cloned elements. */
export const PSEUDO_CLASS_PREFIX = '__pseudo_';

/** Matches a generated pseudo-element class name (e.g. `__pseudo_1a2b3c4d`). */
export const PSEUDO_CLASS_RE = /^__pseudo_[0-9a-f]+$/;

const stopEvent = (e: { stopPropagation: () => void }) => e.stopPropagation();

/**
 * Shared popover props for combo boxes rendered inside the edit modal.
 * Prevents pointer events from leaking through to the edit overlay
 * which would otherwise trigger unintended drag/resize gestures.
 */
export const COMBO_POPOVER_PROPS = {
  onMouseDown: stopEvent,
  onClick: stopEvent,
};

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

/** Pattern matching fully-transparent rgba color values from getComputedStyle. */
export const TRANSPARENT_COLOR_RE = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/;

/**
 * Inherited CSS properties lost when a clone is reparented to document.body,
 * because they no longer cascade from the original ancestors.
 */
export const INHERITED_CSS_PROPS = [
  'color',
  'direction',
  'font',
  'font-family',
  'font-feature-settings',
  'font-kerning',
  'font-size',
  'font-size-adjust',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-variation-settings',
  'font-weight',
  'letter-spacing',
  'line-height',
  'list-style-type',
  'list-style-position',
  'list-style-image',
  'overflow-wrap',
  'tab-size',
  'text-align',
  'text-indent',
  'text-transform',
  'text-wrap',
  'visibility',
  'white-space',
  'white-space-collapse',
  'word-break',
  'word-spacing',
  'writing-mode',
  'border-collapse',
  'border-spacing',
  '-webkit-font-smoothing',
  '-webkit-text-fill-color',
  '-webkit-text-stroke-width',
  '-webkit-text-stroke-color',
  'text-rendering',
];

/**
 * Non-inherited layout styles that are often supplied by scoped component CSS.
 * These are copied into preview clones because the clone may no longer sit
 * under the ancestor class that scoped the original selector.
 */
export const CLONE_LAYOUT_CSS_PROPS = [
  'display',
  'align-content',
  'align-items',
  'align-self',
  'justify-content',
  'justify-items',
  'justify-self',
  'place-content',
  'place-items',
  'place-self',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'gap',
  'row-gap',
  'column-gap',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'overflow',
  'overflow-x',
  'overflow-y',
];

/**
 * Background CSS properties copied only for non-hovered elements.
 * For hovered elements the CSS classes on the clone already provide the
 * correct resting-state background.
 */
export const BACKGROUND_CSS_PROPS = new Set([
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-attachment',
  'background-clip',
  'background-origin',
  'background-blend-mode',
]);

/** Selector for managed element containers (edit clones). */
export const MANAGED_ELEMENT_SELECTOR = `[${DEVTOOL_MANAGED_ATTR}]`;

/** Selector for elements marked with the devtool ignore attribute. */
const DEVTOOL_IGNORE_SELECTOR = `[${DEVTOOL_IGNORE_ATTR}]`;

/** Selector for resize handle elements. */
const DEVTOOL_RESIZE_SELECTOR = `[${DEVTOOL_RESIZE_HANDLE_ATTR}]`;

/** Set of element IDs belonging to tool overlays. */
export const IGNORED_ELEMENT_IDS = new Set([
  MEASURE_OVERLAY_ID,
  EDIT_OVERLAY_ID,
  LAYOUT_OVERLAY_ID,
  LAYOUT_SETTINGS_FLYOUT_ID,
  DEVELOPER_TOOLBAR_ID,
]);

/** Combined selector matching all ignored tool UI elements. */
export const IGNORED_SELECTOR = [
  ...[...IGNORED_ELEMENT_IDS].map((id) => `#${id}`),
  DEVTOOL_IGNORE_SELECTOR,
  DEVTOOL_RESIZE_SELECTOR,
].join(',');

/** Panel ID for the top-level "Add from EUI" component list. */
export const ADD_EUI_PANEL_ID = 'addEuiPanel';

/** Prefix for variant sub-panel IDs. */
export const VARIANT_PANEL_PREFIX = 'addEuiVariant_';
