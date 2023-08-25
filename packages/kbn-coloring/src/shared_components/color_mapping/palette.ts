/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from './config';

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
