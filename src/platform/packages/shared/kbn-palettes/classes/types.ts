/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type KbnPaletteType = 'categorical' | 'gradient';

/**
 * Common palette definition used throughout kibana
 */
export interface IKbnPalette {
  /**
   * Unique identifier for the palette
   */
  id: string;
  /**
   * Display name of this palette.
   */
  name: string;
  /**
   * A tag for the palette displayed opposite of the `name`.
   */
  tag?: string;
  /**
   * Type of pallette
   */
  type: KbnPaletteType;
  /**
   * Number of colors to display
   */
  colorCount: number;
  /**
   * Palette belongs to an outdated theme set
   */
  legacy: boolean;
  /**
   * Alternate aliases/ids this palette matches
   */
  aliases: string[];
  /**
   * Excluded from `getAll` but can still query for palette with `get`/`query`
   *
   * An example would be `KbnPalette.Neutral` palette. I want to exclude it from the list of all available palettes, but I still want to `get`/`query` the palette.
   */
  standalone?: boolean;
  /**
   * Returns array of colors, optionally provide desired number of colors (`n`)
   */
  colors: (n?: number) => string[];
  /**
   * Returns color provided index and optional total number of colors
   */
  getColor: (colorIndex: number, numberOfColors?: number) => string;
}
