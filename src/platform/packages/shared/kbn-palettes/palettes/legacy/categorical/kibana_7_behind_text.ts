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

export const kibana7BehindText = new KbnCategoricalPalette({
  id: KbnPalette.Kibana7BehindText,
  name: i18n.translate('palettes.kibana7BehindText.name', {
    defaultMessage: 'Kibana 7.0 (behind text)',
  }),
  standalone: true,
  colorCount: 10,
  colors: [
    '#6dccb1',
    '#79aad9',
    '#ee789d',
    '#a987d1',
    '#e4a6c7',
    '#f1d86f',
    '#d2c0a0',
    '#f5a35c',
    '#c47c6c',
    '#ff7e62',
    '#98dfcc',
    '#a0c7e9',
    '#f8a0bd',
    '#c6ace3',
    '#f2c4dc',
    '#fbe899',
    '#e4d7be',
    '#ffc08b',
    '#daa498',
    '#ffa590',
    '#c3f3e5',
    '#c9e2fa',
    '#ffc9dc',
    '#e1d1f6',
    '#ffe0f1',
    '#fff9c4',
    '#f6eddd',
    '#ffdeba',
    '#efcbc4',
    '#ffccbe',
  ],
});
