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
import { KbnColorFnPalette } from '../../classes/color_fn_palette';
import { KbnPalette } from '../../constants';

export const kibana7Palette = new KbnColorFnPalette({
  id: KbnPalette.Kibana7,
  type: 'categorical',
  aliases: [
    KbnPalette.Default, // needed when switching between new and old themes
    KbnPalette.Amsterdam, // to assign to existing default palettes
  ],
  name: i18n.translate('palettes.kibana7.name', {
    defaultMessage: 'Kibana 7.0',
  }),
  colorCount: 10,
  defaultNumberOfColors: 30,
  // Return exact colors requested given enough rotations
  colorFn: (n) => euiPaletteColorBlind({ rotations: Math.ceil(n / 10) }).slice(0, n),
});
