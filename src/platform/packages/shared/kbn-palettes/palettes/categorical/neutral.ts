/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  KbnCategoricalPalette,
  KbnCategoricalPaletteConfig,
} from '../../classes/categorical_palette';
import { KbnPalette } from '../../constants';

const commonProps = {
  id: KbnPalette.Neutral,
  standalone: true,
  name: i18n.translate('palettes.elastic.name', {
    defaultMessage: 'Neutral',
  }),
} satisfies Omit<KbnCategoricalPaletteConfig, 'colors'>;

const lightNeutralPalette = new KbnCategoricalPalette({
  ...commonProps,
  colors: ['#F6F9FC', '#D0D4DA', '#989FAA', '#666D78', '#373D45'],
});

const darkNeutralPalette = new KbnCategoricalPalette({
  ...commonProps,
  colors: ['#F6F9FC', '#C9D4E6', '#89A0C4', '#546D95', '#283C5C'],
});

export const getNeutralPalette = (darkMode: boolean) =>
  darkMode ? darkNeutralPalette : lightNeutralPalette;
