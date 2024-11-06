/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Optional } from 'utility-types';
import { BaseKbnPaletteConfig, BaseKbnPalette } from './palette';
import { IKbnPalette } from './types';

export interface LegacyGradientPaletteConfig extends Optional<BaseKbnPaletteConfig, 'colorCount'> {
  colorFactory: (n: number) => string[];
}

export class LegacyGradientPalette extends BaseKbnPalette implements IKbnPalette {
  public readonly type = 'gradient' as const;

  #colorFactory: (n: number) => string[];

  constructor({ colorFactory, colorCount = 10, ...rest }: LegacyGradientPaletteConfig) {
    super({ ...rest, colorCount });

    this.#colorFactory = colorFactory;
  }

  public colors = (n: number = 10) => {
    return this.#colorFactory(n);
  };

  public scale = (n: number) => {
    return 'red';
  };
}
