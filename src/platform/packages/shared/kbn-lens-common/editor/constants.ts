/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Width of the drag-drop extra targets (e.g., "Alt/Option to duplicate" tooltip).
 * This is used to override the default max-width from @kbn/dom-drag-drop.
 */
export const DRAG_DROP_EXTRA_TARGETS_WIDTH = 280;

/**
 * Total padding needed to accommodate drag-drop extra targets.
 * Calculated as: DRAG_DROP_EXTRA_TARGETS_WIDTH + 8px gap + 8px buffer = 296px
 */
export const DRAG_DROP_EXTRA_TARGETS_PADDING = 296;
