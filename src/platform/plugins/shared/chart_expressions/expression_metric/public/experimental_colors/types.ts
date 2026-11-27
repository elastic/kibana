/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, ReactNode } from 'react';
import type { Mode } from '@kbn/contrast-roles';
import type { Targets, TargetsStore } from './targets_store';

export interface TileInput {
  /** The tile's color, from its palette step or static color, or the empty shade when it has none. */
  color: string;
  /** The tile has no color, so `color` is the empty shade. Dark's is tinted blue, so its hue can't tell. */
  noColor: boolean;
  mode: Mode;
  /** The color is a step of a single-hue ramp palette. */
  ramp: boolean;
  hasTrend: boolean;
  /** The color paints the tile's background, rather than its value. */
  isBackground: boolean;
}

export interface TileColors {
  /** The tile's background. Only for background tiles. */
  fill?: string;
  /** The value's text: on the fill for background tiles, on the surface otherwise. */
  valueColor?: string;
  /** The title's text, on the fill. The chart's theme colors every title, so it only applies to charts of one tile. */
  titleColor?: string;
  /** The progress bar, with the fill as the tile's background. Without it, the bar is the fill. */
  bar?: string;
}

/** A control in the developer toolbar panel: a slider for a number target, or a switch for an on/off one. */
export type Control<Key extends string = string> =
  | { type: 'range'; key: Key; label: string; max: number }
  | { type: 'switch'; key: Key; label: string };

export interface Variant {
  /** The APCA Lc targets the variant's colors are solved for, and its options, tuned from the developer toolbar. */
  targets: TargetsStore<Targets>;
  controls: readonly Control[];
  /** A tile's colors, or undefined to keep the chart's own. */
  tile(input: TileInput): TileColors | undefined;
  /** Wraps the chart, for styling it can't take as colors. `tiles` is indexed by row. */
  Decorations?: ComponentType<{
    tiles: ReadonlyArray<TileInput | undefined>;
    children: ReactNode;
  }>;
}
