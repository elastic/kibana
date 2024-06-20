/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed, euiPaletteColorBlind } from '@elastic/eui';
import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

export const getLogLevelColor = (
  logLevelCoalescedValue: LogLevelCoalescedValue,
  euiTheme: EuiThemeComputed
): string | undefined => {
  switch (logLevelCoalescedValue) {
    case LogLevelCoalescedValue.trace:
    case LogLevelCoalescedValue.debug:
      return euiTheme.colors.disabled;
    case LogLevelCoalescedValue.info:
      return euiPaletteColorBlind()[1];
    case LogLevelCoalescedValue.warning:
      return '#F2BC5C';
    case LogLevelCoalescedValue.error:
      return euiPaletteColorBlind()[9];
    case LogLevelCoalescedValue.critical:
    case LogLevelCoalescedValue.fatal:
      return euiPaletteColorBlind()[2];
    default:
      return euiTheme.colors.lightShade;
  }
};
