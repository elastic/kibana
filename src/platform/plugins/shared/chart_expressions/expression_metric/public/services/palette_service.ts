/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PaletteRegistry } from '@kbn/coloring';

let chartService: ChartsPluginStart | undefined;

export function setChartsService(_chartService: ChartsPluginStart) {
  chartService = _chartService;
}

let paletteServicePromise: Promise<PaletteRegistry> | null = null;
export function getPaletteService() {
  if (paletteServicePromise) {
    return paletteServicePromise;
  }

  paletteServicePromise = new Promise(async (resolve, reject) => {
    if (!chartService) {
      reject();
      return;
    }
    const paletteService = await chartService.palettes.getPalettes();
    resolve(paletteService);
  });
  return paletteServicePromise;
}