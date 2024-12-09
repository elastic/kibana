/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma, { Scale } from 'chroma-js';
import { Optional } from 'utility-types';
import { IKbnPalette } from './types';
import { KbnBasePalette, KbnBasePaletteConfig } from './palette';

export interface KbnGradientPaletteConfig extends Optional<KbnBasePaletteConfig, 'colorCount'> {
  colors: string[];
}

export class KbnGradientPalette extends KbnBasePalette implements IKbnPalette {
  public readonly type = 'gradient' as const;

  #scale: Scale;

  constructor({ colors, colorCount = 10, ...rest }: KbnGradientPaletteConfig) {
    super({ ...rest, colorCount });

    this.#scale = chroma.scale(colors).mode('lab');
  }

  public colors = (n?: number) => {
    return this.#scale.colors(n, 'hex');
  };
}
