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
import { IKbnPalette } from './types';

export interface KbnColorFnPaletteConfig extends Optional<KbnBasePaletteConfig, 'colorCount'> {
  colorFn: (n: number) => string[];
}

export class KbnColorFnPalette extends KbnBasePalette implements IKbnPalette {
  public readonly type = 'gradient' as const;

  #colorFn: (n: number) => string[];

  constructor({ colorFn, colorCount = 10, ...rest }: KbnColorFnPaletteConfig) {
    super({ ...rest, colorCount });

    this.#colorFn = colorFn;
  }

  public colors = (n: number = 10) => {
    return this.#colorFn(n);
  };
}
