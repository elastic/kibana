/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { CategoricalPalette } from '../../../classes/categorical_palette';

// export const KIBANA_7_PALETTE_COLORS = [
//   '#54b399',
//   '#6092c0',
//   '#d36086',
//   '#9170b8',
//   '#ca8eae',
//   '#d6bf57',
//   '#b9a888',
//   '#da8b45',
//   '#aa6556',
//   '#e7664c',
// ];

export const kibana7Palette = new CategoricalPalette({
  id: 'eui_amsterdam',
  aliases: ['eui_amsterdam_color_blind'],
  name: i18n.translate('palettes.kibana7.name', {
    defaultMessage: 'Kibana 7',
  }),
  colors: [
    '#54b399',
    '#6092c0',
    '#d36086',
    '#9170b8',
    '#ca8eae',
    '#d6bf57',
    '#b9a888',
    '#da8b45',
    '#aa6556',
    '#e7664c',
  ],
});
