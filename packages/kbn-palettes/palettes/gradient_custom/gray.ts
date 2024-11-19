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
import { getBackgroundColor } from './getBackgroundColor';
import { KbnPalette } from '../../constants';

export const getGrayPalette = (darkMode: boolean) =>
  new KbnGradientPalette({
    id: KbnPalette.Gray,
    name: i18n.translate('palettes.gray.name', {
      defaultMessage: 'Gray',
    }),
    colors: [getBackgroundColor(darkMode), '#89A0C4'],
  });
