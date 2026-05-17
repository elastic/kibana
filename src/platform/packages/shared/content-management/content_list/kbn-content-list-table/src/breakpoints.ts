/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Layout constants shared by the table shell and individual column cells.
 *
 * Lives in its own module so column-level files can read it without
 * importing `content_list_table.tsx`, which itself imports `./column`
 * (a cycle that breaks Jest's module loader and produces
 * `Cannot read properties of undefined (reading 'NameColumn')`).
 */

/**
 * Viewport width (px) at which `Column.Name` is allowed to grow past its
 * default `64em` cap. `2560px` matches a common 4K external display width
 * — at that size the default footprint leaves enough trailing whitespace
 * that giving some of it back to the title column is a clear win.
 *
 * Not tied to a named EUI breakpoint because EUI tops out at `xl` (~1200px),
 * so the value would have to be a hard-coded magic number either way.
 */
export const WIDE_VIEWPORT_NAME_BREAKPOINT_PX = 2560;
