/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteWarm } from '@elastic/eui';
import { LegacyGradientPalette } from '../../../classes/legacy_gradient_palette';

export const warmPalette = new LegacyGradientPalette({
  id: 'warm',
  name: i18n.translate('palettes.warm.name', {
    defaultMessage: 'Warm',
  }),
  colorFactory: euiPaletteWarm,
});
