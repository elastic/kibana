/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColorMapping } from '../config';
import { ElasticBrandPalette } from './elastic_brand';
import { EUIAmsterdamColorBlindPalette } from './eui_amsterdam';
import { KibanaV7LegacyPalette } from './kibana_legacy';
import { NeutralPalette } from './neutral';

export const AVAILABLE_PALETTES = new Map<string, ColorMapping.CategoricalPalette>([
  [EUIAmsterdamColorBlindPalette.id, EUIAmsterdamColorBlindPalette],
  [ElasticBrandPalette.id, ElasticBrandPalette],
  [KibanaV7LegacyPalette.id, KibanaV7LegacyPalette],
  [NeutralPalette.id, NeutralPalette],
]);

/**
 * This function should be instanciated once at the root of the component with the available palettes and
 * a choosed default one and shared across components to keep a single point of truth of the available palettes and the default
 * one.
 */
export function getPalette(
  palettes: Map<string, ColorMapping.CategoricalPalette>,
  defaultPalette: ColorMapping.CategoricalPalette
): (paletteId: string) => ColorMapping.CategoricalPalette {
  return (paletteId) => palettes.get(paletteId) ?? defaultPalette;
}

export * from './eui_amsterdam';
export * from './elastic_brand';
export * from './kibana_legacy';
export * from './neutral';
