/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed, euiPaletteForTemperature, euiPaletteForStatus } from '@elastic/eui';
import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

export const getLogLevelColor = (
  logLevelCoalescedValue: LogLevelCoalescedValue,
  euiTheme: EuiThemeComputed
): string | undefined => {
  const euiPaletteForTemperature6 = euiPaletteForTemperature(6);
  const euiPaletteForStatus9 = euiPaletteForStatus(9);

  switch (logLevelCoalescedValue) {
    case LogLevelCoalescedValue.debug:
      return euiPaletteForTemperature6[2]; // lighter, closer to the default color for all other unknown log levels
    case LogLevelCoalescedValue.info:
      return euiPaletteForTemperature6[1];
    case LogLevelCoalescedValue.notice:
      return euiPaletteForTemperature6[0]; // darker as it has higher importance than "debug" and "info"
    case LogLevelCoalescedValue.warning:
      return euiPaletteForStatus9[4];
    case LogLevelCoalescedValue.error:
      return euiPaletteForStatus9[5];
    case LogLevelCoalescedValue.critical:
      return euiPaletteForStatus9[6];
    case LogLevelCoalescedValue.alert:
      return euiPaletteForStatus9[7];
    case LogLevelCoalescedValue.emergency:
    case LogLevelCoalescedValue.fatal:
      return euiPaletteForStatus9[8];
    default:
      return euiTheme.colors.lightShade;
  }
};
