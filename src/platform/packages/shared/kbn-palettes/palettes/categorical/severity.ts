/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { KbnCategoricalPalette } from '../../classes/categorical_palette';
import { KbnPalette } from '../../constants';

export const severityPalette = new KbnCategoricalPalette({
  id: KbnPalette.Severity,
  name: i18n.translate('palettes.severity.name', {
    defaultMessage: 'Severity',
  }),
  colorCount: 6,
  colors: ['#24C292', '#B5E5F2', '#FCD883', '#FF995E', '#EE4C48', '#E3E8F2'],
});
