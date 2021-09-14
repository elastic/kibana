/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export enum ColorSchemas {
  Blues = 'Blues',
  Greens = 'Greens',
  Greys = 'Greys',
  Reds = 'Reds',
  YellowToRed = 'Yellow to Red',
  GreenToRed = 'Green to Red',
}

export interface ColorSchema {
  value: ColorSchemas;
  text: string;
}

export interface RawColorSchema {
  id: ColorSchemas;
  label: string;
  value: Array<[number, number[]]>;
}

export interface ColorMap {
  [key: string]: RawColorSchema;
}

export const vislibColorMaps: ColorMap = {
  // Sequential
  [ColorSchemas.Blues]: {
    id: ColorSchemas.Blues,
    label: i18n.translate('charts.colormaps.bluesText', {
      defaultMessage: 'Blues',
    }),
    value: [
      [0, [0.969, 0.984, 1]],
      [0.114, [0.879, 0.927, 0.971]],
      [0.227, [0.793, 0.87, 0.943]],
      [0.341, [0.662, 0.81, 0.897]],
      [0.454, [0.492, 0.722, 0.855]],
      [0.568, [0.331, 0.622, 0.805]],
      [0.681, [0.199, 0.513, 0.746]],
      [0.795, [0.093, 0.397, 0.674]],
      [0.908, [0.031, 0.282, 0.558]],
      [1, [0.031, 0.188, 0.42]],
    ],
  },
  [ColorSchemas.Greens]: {
    id: ColorSchemas.Greens,
    label: i18n.translate('charts.colormaps.greensText', {
      defaultMessage: 'Greens',
    }),
    value: [
      [0, [0.969, 0.988, 0.961]],
      [0.114, [0.904, 0.963, 0.886]],
      [0.227, [0.802, 0.922, 0.776]],
      [0.341, [0.672, 0.868, 0.647]],
      [0.454, [0.519, 0.798, 0.515]],
      [0.568, [0.345, 0.715, 0.409]],
      [0.681, [0.201, 0.613, 0.322]],
      [0.795, [0.087, 0.502, 0.234]],
      [0.908, [0, 0.383, 0.154]],
      [1, [0, 0.267, 0.106]],
    ],
  },
  [ColorSchemas.Greys]: {
    id: ColorSchemas.Greys,
    label: i18n.translate('charts.colormaps.greysText', {
      defaultMessage: 'Greys',
    }),
    value: [
      [0, [1, 1, 1]],
      [0.114, [0.946, 0.946, 0.946]],
      [0.227, [0.867, 0.867, 0.867]],
      [0.341, [0.771, 0.771, 0.771]],
      [0.454, [0.643, 0.643, 0.643]],
      [0.568, [0.513, 0.513, 0.513]],
      [0.681, [0.392, 0.392, 0.392]],
      [0.795, [0.257, 0.257, 0.257]],
      [0.908, [0.105, 0.105, 0.105]],
      [1, [0, 0, 0]],
    ],
  },
  [ColorSchemas.Reds]: {
    id: ColorSchemas.Reds,
    label: i18n.translate('charts.colormaps.redsText', {
      defaultMessage: 'Reds',
    }),
    value: [
      [0, [1, 0.961, 0.941]],
      [0.114, [0.996, 0.886, 0.834]],
      [0.227, [0.99, 0.76, 0.666]],
      [0.341, [0.988, 0.616, 0.497]],
      [0.454, [0.986, 0.472, 0.347]],
      [0.568, [0.958, 0.314, 0.226]],
      [0.681, [0.872, 0.168, 0.146]],
      [0.795, [0.741, 0.081, 0.102]],
      [0.908, [0.579, 0.042, 0.074]],
      [1, [0.404, 0, 0.051]],
    ],
  },
  [ColorSchemas.YellowToRed]: {
    id: ColorSchemas.YellowToRed,
    label: i18n.translate('charts.colormaps.yellowToRedText', {
      defaultMessage: 'Yellow to Red',
    }),
    value: [
      [0, [1, 1, 0.8]],
      [0.114, [1, 0.936, 0.643]],
      [0.227, [0.997, 0.865, 0.492]],
      [0.341, [0.996, 0.739, 0.343]],
      [0.454, [0.994, 0.605, 0.258]],
      [0.568, [0.99, 0.417, 0.197]],
      [0.681, [0.943, 0.212, 0.14]],
      [0.795, [0.835, 0.064, 0.124]],
      [0.908, [0.675, 0, 0.149]],
      [1, [0.502, 0, 0.149]],
    ],
  },

  [ColorSchemas.GreenToRed]: {
    id: ColorSchemas.GreenToRed,
    label: i18n.translate('charts.colormaps.greenToRedText', {
      defaultMessage: 'Green to Red',
    }),
    value: [
      [0, [0, 0.408, 0.216]],
      [0.029, [0.028, 0.46, 0.243]],
      [0.059, [0.06, 0.519, 0.273]],
      [0.088, [0.088, 0.57, 0.3]],
      [0.117, [0.155, 0.622, 0.327]],
      [0.147, [0.236, 0.662, 0.347]],
      [0.176, [0.33, 0.707, 0.371]],
      [0.205, [0.41, 0.745, 0.389]],
      [0.235, [0.489, 0.78, 0.398]],
      [0.264, [0.557, 0.81, 0.405]],
      [0.294, [0.636, 0.845, 0.414]],
      [0.323, [0.694, 0.87, 0.444]],
      [0.352, [0.757, 0.897, 0.484]],
      [0.382, [0.812, 0.92, 0.52]],
      [0.411, [0.869, 0.945, 0.569]],
      [0.44, [0.909, 0.962, 0.625]],
      [0.47, [0.956, 0.982, 0.689]],
      [0.499, [0.997, 0.999, 0.745]],
      [0.528, [0.999, 0.964, 0.689]],
      [0.558, [0.998, 0.931, 0.633]],
      [0.587, [0.997, 0.893, 0.569]],
      [0.616, [0.995, 0.848, 0.519]],
      [0.646, [0.994, 0.786, 0.468]],
      [0.675, [0.993, 0.732, 0.422]],
      [0.705, [0.99, 0.667, 0.373]],
      [0.734, [0.98, 0.597, 0.341]],
      [0.763, [0.969, 0.517, 0.304]],
      [0.793, [0.96, 0.447, 0.272]],
      [0.822, [0.93, 0.371, 0.237]],
      [0.851, [0.899, 0.305, 0.207]],
      [0.881, [0.863, 0.23, 0.172]],
      [0.91, [0.824, 0.17, 0.153]],
      [0.939, [0.762, 0.111, 0.151]],
      [0.969, [0.709, 0.059, 0.15]],
      [0.998, [0.647, 0, 0.149]],
      [1, [0.647, 0, 0.149]],
    ],
  },
};

export const colorSchemas: ColorSchema[] = Object.values(vislibColorMaps).map(({ id, label }) => ({
  value: id,
  text: label,
}));
