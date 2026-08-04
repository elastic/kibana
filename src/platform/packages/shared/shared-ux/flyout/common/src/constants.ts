/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimum width a grid cell needs to stay readable, in px. Shared by the metadata pairs and
 * the info blocks so both drop a column at the same container width — otherwise the two
 * reflow at staggered widths and the header appears to collapse in steps.
 *
 * Thresholds derive from this: `n` columns need `n * FLYOUT_MIN_CELL_WIDTH`.
 */
export const FLYOUT_MIN_CELL_WIDTH = 140;

/** Maximum number of columns either grid will use, however wide the container. */
export const FLYOUT_MAX_GRID_COLUMNS = 3;

/**
 * The metadata line is designed for three key-value pairs. Not enforced — exceeding it warns
 * in development but still renders, matching how the info blocks accept any number of items.
 */
export const MAX_METADATA_ITEMS = 3;
