/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { KbnCategoricalPalette } from '../../../classes/categorical_palette';
import { KbnPalette } from '../../../constants';

export const kibana4Palette = new KbnCategoricalPalette({
  id: KbnPalette.Kibana4,
  aliases: [
    'kibana_palette', // used in legacy chart palette service
  ],
  name: i18n.translate('palettes.kibana4.name', {
    defaultMessage: 'Kibana 4.0',
  }),
  colorCount: 10,
  // colors taken from `createLegacyColorPalette` in charts plugin method
  // to match legacy `kibana_palette` (aka Compatibility) palette
  colors: [
    '#00a69b',
    '#57c17b',
    '#6f87d8',
    '#663db8',
    '#bc52bc',
    '#9e3533',
    '#daa05d',
    '#bfaf40',
    '#4050bf',
    '#bf5040',
    '#40afbf',
    '#70bf40',
    '#8f40bf',
    '#bf40a7',
    '#40bf58',
    '#bf9740',
    '#4068bf',
    '#bf4048',
    '#40bfb7',
    '#87bf40',
  ],
});
