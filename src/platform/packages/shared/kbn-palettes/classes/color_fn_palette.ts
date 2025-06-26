/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Optional } from 'utility-types';
import { KbnBasePaletteConfig, KbnBasePalette } from './palette';
import { IKbnPalette, KbnPaletteType } from './types';

const DEFAULT_COLOR_COUNT = 10;

export interface KbnColorFnPaletteConfig extends Optional<KbnBasePaletteConfig, 'colorCount'> {
  type: KbnPaletteType;
  colorFn: (n: number) => string[];
  /**
   * Default number of colors returned from `colors` method.
   *
   * @default `colorCount`
   */
  defaultNumberOfColors?: number;
}

export class KbnColorFnPalette extends KbnBasePalette implements IKbnPalette {
  public readonly type: KbnPaletteType;

  #colorFn: (n: number) => string[];
  #defaultNumberOfColors: number;

  constructor({
    type,
    colorFn,
    defaultNumberOfColors,
    colorCount = DEFAULT_COLOR_COUNT,
    ...rest
  }: KbnColorFnPaletteConfig) {
    super({ ...rest, colorCount });

    this.type = type;

    this.#colorFn = colorFn;
    this.#defaultNumberOfColors = defaultNumberOfColors ?? colorCount;
  }

  public colors = (n: number = this.#defaultNumberOfColors) => {
    return this.#colorFn(n === undefined ? n : Math.max(1, n));
  };
}
