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

export const elasticClassicPalette = new KbnCategoricalPalette({
  id: KbnPalette.ElasticClassic,
  name: i18n.translate('palettes.classic.name', {
    defaultMessage: 'Elastic classic',
  }),
  colors: ['#20377d', '#7de2d1', '#ff957d', '#f04e98', '#0077cc', '#fec514'],
});
