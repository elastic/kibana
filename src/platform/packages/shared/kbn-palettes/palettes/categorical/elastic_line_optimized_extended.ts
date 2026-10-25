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
import { visPaletteSize } from './elastic';
import { getLineOptimizedColors, repeatColors } from './elastic_line_optimized';

export const elasticLineOptimizedExtendedPalette = new KbnColorFnPalette({
  id: KbnPalette.ElasticLineOptimized,
  type: 'categorical',
  aliases: [],
  colorCount: visPaletteSize,
  defaultNumberOfColors: visPaletteSize * 3,
  name: i18n.translate('palettes.elasticLineOptimizedExtended.name', {
    defaultMessage: 'Elastic (line optimized)',
  }),
  colorFn: (n) => repeatColors(getLineOptimizedColors(euiPaletteColorBlind()), n),
});
