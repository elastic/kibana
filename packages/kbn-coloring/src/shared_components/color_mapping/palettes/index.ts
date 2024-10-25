/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColorMapping } from '../config';
import { NeutralPalette, ElasticPalette } from './categorical';
import {
  CoolPalette,
  GrayPalette,
  RedPalette,
  GreenPalette,
  TemperaturePalette,
  ComplementaryPalette,
} from './gradient';
import { ElasticClassicPalette, Kibana7Palette, Kibana4Palette } from './legacy';

export const CATEGORICAL_PALETTES = [ElasticPalette, NeutralPalette];
export const GRADIENT_PALETTES = [
  CoolPalette,
  GrayPalette,
  RedPalette,
  GreenPalette,
  TemperaturePalette,
  ComplementaryPalette,
];
export const LEGACY_PALETTES = [Kibana7Palette, Kibana4Palette, ElasticClassicPalette];

export const AVAILABLE_PALETTES = new Map<string, ColorMapping.CategoricalPalette>(
  [
    ...CATEGORICAL_PALETTES,
    // ...GRADIENT_PALETTES, // exclude for now
    ...LEGACY_PALETTES,
  ].map((p) => [p.id, p])
);

/**
 * This function should be instantiated once at the root of the component with the available palettes and
 * a choose default one and shared across components to keep a single point of truth of the available palettes and the default
 * one.
 */
export function getPalette(
  palettes: Map<string, ColorMapping.CategoricalPalette>,
  defaultPalette: ColorMapping.CategoricalPalette
): (paletteId: string) => ColorMapping.CategoricalPalette {
  return (paletteId) => palettes.get(paletteId) ?? defaultPalette;
}

export * from './categorical';
export * from './gradient';
export * from './legacy';
