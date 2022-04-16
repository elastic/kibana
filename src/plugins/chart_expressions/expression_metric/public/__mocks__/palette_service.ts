/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteState } from '@kbn/charts-plugin/common';

export const getPaletteService = () => {
  return {
    get: (paletteName: string) => ({
      getColorForValue: (value: number, params: CustomPaletteState) => {
        const { colors = [], stops = [] } = params ?? {};
        const lessThenValueIndex = stops.findIndex((stop) => value <= stop);
        return colors[lessThenValueIndex];
      },
    }),
  };
};
