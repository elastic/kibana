/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { KbnGradientPalette } from '../../classes/gradient_palette';
import { ThemeMode } from '../../types';
import { getBackgroundColor } from './getBackgroundColor';
import { KbnPalette } from '../../constants';

export const getComplementaryPalette = (mode: ThemeMode) => {
  return new KbnGradientPalette({
    id: KbnPalette.Complementary,
    name: i18n.translate('palettes.complementary.name', {
      defaultMessage: 'Complementary',
    }),
    colors: ['#599DFF', getBackgroundColor(mode), '#ED9E00'],
  });
};
