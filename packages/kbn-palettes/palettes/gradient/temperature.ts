/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { GradientPalette } from '../../classes/gradient_palette';
import { ThemeMode } from '../../types';
import { getBackgroundColor } from './getBackgroundColor';

export const getTemperaturePalette = (mode: ThemeMode) =>
  new GradientPalette({
    id: 'temperature',
    name: i18n.translate('palettes.temperature.name', {
      defaultMessage: 'Temperature',
    }),
    colors: ['#599DFF', getBackgroundColor(mode), '#F66D64'],
  });

export const euiPaletteForTemperature = getTemperaturePalette('LIGHT').colors;
