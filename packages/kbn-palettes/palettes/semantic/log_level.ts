/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { $Keys } from 'utility-types';
import { KbnPalette } from '../../constants';

// TODO: update colors to vis colors
const logLevelColors = {
  Emerg: '#F66D64',
  Alert: '#E78E76',
  Crit: '#E7A584',
  Error: '#E7BD91',
  Warn: '#E8D297',
  Notice: '#C7D59',
  Info: '#9CB1D3',
  Debug: '#718FBC',
  Other: '#CED4DE',
};
type LogLevelKeys = $Keys<typeof logLevelColors>;

/**
 * Defines a palette to be used directly and does not fully implement IKbnPalette
 */
export const logLevelPalette = {
  id: KbnPalette.LogLevel,
  name: i18n.translate('palettes.logLevel.name', {
    defaultMessage: 'Log Level',
  }),
  getColor: (key: LogLevelKeys) => {
    return logLevelColors[key];
  },
  colors: logLevelColors,
};
