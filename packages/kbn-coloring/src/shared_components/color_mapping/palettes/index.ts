/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';
import { ElasticBrandPalette } from './elastic_brand';
import { EUIAmsterdamColorBlindPalette } from './eui_amsterdam';
import { KibanaV7LegacyPalette } from './kibana_legacy';
import { NeutralPalette } from './neutral';
import { ColorPalette01 } from './color_palette_01';
import { ColorPalette02 } from './color_palette_02';
import { ColorPalette03 } from './color_palette_03';
import { ColorPalette04 } from './color_palette_04';

export const AVAILABLE_PALETTES = new Map<string, ColorMapping.CategoricalPalette>([
  [EUIAmsterdamColorBlindPalette.id, EUIAmsterdamColorBlindPalette],
  [ElasticBrandPalette.id, ElasticBrandPalette],
  [KibanaV7LegacyPalette.id, KibanaV7LegacyPalette],
  [NeutralPalette.id, NeutralPalette],
  [ColorPalette01.id, ColorPalette01],
  [ColorPalette02.id, ColorPalette02],
  [ColorPalette03.id, ColorPalette03],
  [ColorPalette04.id, ColorPalette04],
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
export * from './color_palette_01';
export * from './color_palette_02';
export * from './color_palette_03';
export * from './color_palette_04';
