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

/**
 * This is not correctly returning the updated vis colors from eui.
 * All gradient function work correctly.
 */
export const elasticPalette = new KbnColorFnPalette({
  id: KbnPalette.Default,
  type: 'categorical',
  aliases: [
    'elastic_borealis', // placeholder - not yet used
    KbnPalette.Amsterdam, // to assign to existing default palettes
  ],
  colorCount: 10,
  defaultNumberOfColors: 30,
  name: i18n.translate('palettes.elastic.name', {
    defaultMessage: 'Elastic',
  }),
  tag: i18n.translate('palettes.elastic.tag', {
    defaultMessage: 'Default',
  }),
  // Return exact colors requested given enough rotations
  colorFn: (n) => euiPaletteColorBlind({ rotations: Math.ceil(n / 10) }).slice(0, n),
});
