/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

/**
 * Declarative shape hint for a skeleton cell, selected from the common
 * loading-state primitives offered by EUI
 * (`EuiSkeletonText` / `EuiSkeletonRectangle` / `EuiSkeletonCircle`).
 *
 * Renderers map the discriminator (`shape`) to the matching EUI component.
 */
/**
 * Permitted `lines` values for a text-shape skeleton. Mirrors EUI's
 * `EuiSkeletonText`'s `LineRange` so descriptors compose with the
 * renderer without a cast.
 */
export type SkeletonTextLines = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type SkeletonDescriptor =
  | {
      /** Multi-line text-like skeleton. */
      shape: 'text';
      /** CSS width (e.g. `'40%'`, `'200px'`). Falls back to `'100%'`. */
      width?: string | number;
      /** Number of simulated text lines (1..10). Defaults to 1. */
      lines?: SkeletonTextLines;
    }
  | {
      /** Solid rectangle (buttons, badges, narrow cells). */
      shape: 'rectangle';
      /** CSS width. Falls back to `'100%'`. */
      width?: string | number;
      /** CSS height. Falls back to a sensible row height. */
      height?: string | number;
    }
  | {
      /** Circle (avatars, icon-only cells). */
      shape: 'circle';
      /** Diameter. */
      size?: string | number;
    };

/**
 * Result returned by a preset's `skeleton` callback.
 *
 * Either a {@link SkeletonDescriptor} (the common case — renderer picks the
 * EUI primitive) or `{ node }` as an escape hatch for exotic shapes that
 * can't be expressed as a single primitive (e.g. a row of icon buttons).
 */
export type SkeletonOutput = SkeletonDescriptor | { node: ReactNode };

/**
 * Type guard for the `{ node }` escape-hatch variant.
 */
export const isCustomSkeletonNode = (output: SkeletonOutput): output is { node: ReactNode } =>
  'node' in output;
