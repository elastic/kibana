/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Optional } from 'utility-types';
import { IKbnPalette, KbnPaletteType } from './types';

export type BaseKbnPaletteConfig = Optional<
  Pick<IKbnPalette, 'id' | 'name' | 'colorCount' | 'legacy' | 'aliases' | 'standalone'>,
  'legacy' | 'aliases'
>;

export abstract class BaseKbnPalette implements IKbnPalette {
  public abstract type: KbnPaletteType;

  public readonly id: string;
  public readonly name: string;
  public readonly colorCount: number;
  public readonly legacy: boolean;
  public readonly standalone: boolean;
  public readonly aliases: string[];

  constructor({
    id,
    name,
    colorCount,
    aliases = [],
    legacy = false,
    standalone = false,
  }: BaseKbnPaletteConfig) {
    this.id = id;
    this.name = name;
    this.colorCount = colorCount;
    this.legacy = legacy;
    this.standalone = standalone;
    this.aliases = aliases;
  }

  public abstract scale: (n: number) => string;
  public abstract colors: (n?: number | undefined) => string[];

  public getColor = (colorIndex: number, numberOfColors?: number) => {
    const colors = this.colors(numberOfColors);
    return colors[colorIndex % colors.length]; // ensure color is always returned
  };
}
