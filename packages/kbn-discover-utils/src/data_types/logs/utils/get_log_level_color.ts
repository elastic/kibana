/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      return euiPaletteForStatus9[6];
    case LogLevelCoalescedValue.critical:
      return '#dc5640'; // This hardcoded value doesn't correspond to any token, it will be updated in v9 with an appropriate token-based scale for borealis theme
    case LogLevelCoalescedValue.alert:
      return '#d24635'; // This hardcoded value doesn't correspond to any token, it will be updated in v9 with an appropriate token-based scale for borealis theme
    case LogLevelCoalescedValue.emergency:
      return '#c73729'; // This hardcoded value doesn't correspond to any token, it will be updated in v9 with an appropriate token-based scale for borealis theme
    case LogLevelCoalescedValue.fatal:
      return euiTheme.colors.danger;
    default:
      return euiTheme.colors.mediumShade;
  }
};
