/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreTheme } from '@kbn/core-theme-browser';
import { getPalettes } from '.';
import { getLegacyPalettes } from './legacy';

export function getKbnPalettes({ version, darkMode }: CoreTheme) {
  if (version !== 'v8') {
    if (!darkMode) {
      return getPalettes('LIGHT');
    }

    if (version === 'borealis') {
      return getPalettes('DARKBLUE');
    }

    return getPalettes('DARK');
  }

  return getLegacyPalettes(darkMode ? 'DARK' : 'LIGHT');
}
