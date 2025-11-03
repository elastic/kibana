/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { euiPaletteForTemperature, euiPaletteForStatus, euiPaletteRed } from '@elastic/eui';
import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

export const getLogLevelColor = (
  logLevelCoalescedValue: LogLevelCoalescedValue,
  euiTheme: EuiThemeComputed
): string | undefined => {
  const euiPaletteForTemperature6 = euiPaletteForTemperature(6);
  const euiPaletteForStatus9 = euiPaletteForStatus(9);
  const euiPaletteRed9 = euiPaletteRed(14);

  switch (logLevelCoalescedValue) {
    case LogLevelCoalescedValue.trace:
      return euiTheme.colors.mediumShade;
    case LogLevelCoalescedValue.debug:
      return euiPaletteForTemperature6[2]; // lighter, closer to the default color for all other unknown log levels
    case LogLevelCoalescedValue.info:
      return euiPaletteForTemperature6[1];
    case LogLevelCoalescedValue.notice:
      return euiPaletteForTemperature6[0]; // darker as it has higher importance than "debug" and "info"
    case LogLevelCoalescedValue.warning:
      return euiPaletteForStatus9[4];
    case LogLevelCoalescedValue.error:
      return euiPaletteRed9[9];
    case LogLevelCoalescedValue.critical:
      return euiPaletteRed9[10];
    case LogLevelCoalescedValue.alert:
      return euiPaletteRed9[11];
    case LogLevelCoalescedValue.emergency:
      return euiPaletteRed9[12];
    case LogLevelCoalescedValue.fatal:
      return euiPaletteRed9[13];
    default:
      return euiTheme.colors.mediumShade;
  }
};
