/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

export const getLogLevelColor = (
  logLevelCoalescedValue: LogLevelCoalescedValue,
  euiTheme: EuiThemeComputed
): string | undefined => {
  switch (logLevelCoalescedValue) {
    case LogLevelCoalescedValue.trace:
      return euiTheme.colors.lightShade;
    case LogLevelCoalescedValue.debug:
      return euiTheme.colors.mediumShade;
    case LogLevelCoalescedValue.info:
      return euiTheme.colors.primary;
    case LogLevelCoalescedValue.warning:
      return euiTheme.colors.warning;
    case LogLevelCoalescedValue.error:
    case LogLevelCoalescedValue.critical:
    case LogLevelCoalescedValue.fatal:
      return euiTheme.colors.danger;
    default:
      return undefined;
  }
};
