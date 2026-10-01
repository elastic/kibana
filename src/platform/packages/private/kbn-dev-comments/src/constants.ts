/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const IGNORE_ATTR = 'data-devtool-ignore';

export const IGNORE_SELECTOR = `[${IGNORE_ATTR}]`;

/** Marks the panel's menus, which close themselves on Escape rather than leave comment mode. */
export const MENU_ATTR = 'data-devtool-menu';

/** Marks the layer's own containers and popover panels, for styles that are the layer's alone. */
export const LAYER_ATTR = 'data-dev-comments';

/** Marks UI the layer shows at a tooltip (a pin on it, a thread or composer open there); see `createTooltipHold`. */
export const AT_TOOLTIP_ATTR = 'data-dev-comments-at-tooltip';

export const AT_TOOLTIP_SELECTOR = `[${AT_TOOLTIP_ATTR}]`;

export const DISPLAY_NAME_STORAGE_KEY = 'dev_comments_display_name';

/** Session storage: a guide handed over a page load, see `createCommentsController`. */
export const GUIDE_HANDOFF_STORAGE_KEY = 'dev_comments_guide';

export const PIN_SIZE = 24;

// Bounds shared with hosts: what the layer produces stays within what a host stores.

export const COMMENT_MAX_LENGTH = 5000;

/** Labels and names: `aria-label` locators, trail step labels, display names. */
export const NAME_MAX_LENGTH = 256;

export const SELECTOR_MAX_LENGTH = 1000;

export const TRAIL_MAX_STEPS = 25;

export const SNAPSHOT_MAX_BYTES = 300_000;

/** Longest side of a screenshot, in pixels. */
export const SNAPSHOT_MAX_DIMENSION = 4000;
