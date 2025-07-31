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

export const kibana7Palette = new KbnCategoricalPalette({
  id: KbnPalette.Kibana7,
  aliases: [
    KbnPalette.Default, // needed when switching between new and old themes
    KbnPalette.Amsterdam, // to assign to existing default palettes
  ],
  name: i18n.translate('palettes.kibana7.name', {
    defaultMessage: 'Kibana 7.0',
  }),
  colorCount: 10,
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
    '#7fc6b3',
    '#88aed0',
    '#de88a5',
    '#ad94ca',
    '#d8abc3',
    '#e1cf81',
    '#cbbea6',
    '#e4a874',
    '#c08c81',
    '#ed8d79',
    '#aad9cc',
    '#b0c9e0',
    '#e9b0c3',
    '#c8b8dc',
    '#e5c7d7',
    '#ebdfab',
    '#dcd4c4',
    '#edc5a2',
    '#d5b2ab',
    '#f3b3a6',
  ],
});
