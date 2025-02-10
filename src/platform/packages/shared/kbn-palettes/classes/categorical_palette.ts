/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Optional } from 'utility-types';
import { KbnBasePalette, KbnBasePaletteConfig } from './palette';
import { IKbnPalette } from './types';

export interface KbnCategoricalPaletteConfig extends Optional<KbnBasePaletteConfig, 'colorCount'> {
  colors: string[];
}

export class KbnCategoricalPalette extends KbnBasePalette implements IKbnPalette {
  public readonly type = 'categorical' as const;

  #colors: string[];

  constructor({ colors, colorCount = colors.length, ...rest }: KbnCategoricalPaletteConfig) {
    super({ ...rest, colorCount });

    this.#colors = colors;
  }

  public colors = (n?: number) => {
    const end = n === undefined ? n : Math.max(1, n);
    return this.#colors.slice(0, end);
  };
}
