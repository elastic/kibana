/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlind } from '@elastic/eui';
import { KbnPalette } from '../../constants';
import { KbnColorFnPalette } from '../../classes/color_fn_palette';
import { KbnCategoricalPalette } from '../../classes/categorical_palette';

/**
 * This is not correctly returning the updated vis colors from eui.
 * All gradient function work correctly.
 */
export const elasticPaletteBad = new KbnColorFnPalette({
  id: KbnPalette.Default,
  type: 'categorical',
  aliases: [
    'elastic_borealis', // placeholder - not yet used
    KbnPalette.Amsterdam, // to assign to existing default palettes
  ],
  colorCount: 10,
  defaultNumberOfColors: 30,
  name: i18n.translate('palettes.elastic.name', {
    defaultMessage: 'Elastic (default)',
  }),
  // Return exact colors requested given enough rotations
  colorFn: (n) => euiPaletteColorBlind({ rotations: Math.ceil(n / 10) }).slice(0, n),
});

export const elasticPalette = new KbnCategoricalPalette({
  id: KbnPalette.Default,
  aliases: [
    'elastic_borealis', // placeholder - not yet used
    KbnPalette.Amsterdam, // to assign to existing default palettes
  ],
  colorCount: 10,
  name: i18n.translate('palettes.elastic.name', {
    defaultMessage: 'Elastic (default)',
  }),
  colors: [
    '#00BEB8',
    '#98E6E2',
    '#599DFF',
    '#B4D5FF',
    '#ED6BA2',
    '#FFBED5',
    '#F66D64',
    '#FFC0B8',
    '#E6AB01',
    '#FCD279',
    '#40CFCA',
    '#B2EDEA',
    '#83B6FF',
    '#C7E0FF',
    '#F290BA',
    '#FFCFE0',
    '#F9928B',
    '#FFD0CA',
    '#EDC041',
    '#FDDE9B',
    '#80DFDC',
    '#CCF3F1',
    '#ACCEFF',
    '#DAEAFF',
    '#F6B5D1',
    '#FFDFEA',
    '#FBB6B2',
    '#FFE0DC',
    '#F3D580',
    '#FEE9BC',
  ],
});
