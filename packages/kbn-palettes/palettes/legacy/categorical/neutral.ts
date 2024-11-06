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
import { ThemeMode } from '../../../types';

const schemeGreys = ['#f2f4fb', '#d4d9e5', '#98a2b3', '#696f7d', '#353642'];
export const NEUTRAL_COLOR_LIGHT = schemeGreys.slice();
export const NEUTRAL_COLOR_DARK = schemeGreys.slice().reverse();

export const getNeutralPalette = (mode: ThemeMode) =>
  new CategoricalPalette({
    id: 'neutral',
    name: i18n.translate('palettes.elastic.name', {
      defaultMessage: 'Neutral',
    }),
    colors: mode === 'LIGHT' ? NEUTRAL_COLOR_LIGHT : NEUTRAL_COLOR_DARK,
  });
