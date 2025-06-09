/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { KbnColorFnPalette } from '../../classes/color_fn_palette';
import { KbnPalette } from '../../constants';

export const kibana7BehindText = new KbnColorFnPalette({
  id: KbnPalette.Kibana7BehindText,
  type: 'categorical',
  name: i18n.translate('palettes.kibana7BehindText.name', {
    defaultMessage: 'Kibana 7.0 (behind text)',
  }),
  standalone: true,
  colorCount: 10,
  defaultNumberOfColors: 30,
  // Return exact colors requested given enough rotations
  colorFn: (n) => euiPaletteColorBlindBehindText({ rotations: Math.ceil(n / 10) }).slice(0, n),
});
