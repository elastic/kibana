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
    case LogLevelCoalescedValue.debug:
      return '#BECFE3';
    case LogLevelCoalescedValue.info:
      return '#90B0D1';
    case LogLevelCoalescedValue.notice:
      return '#6092C0';
    case LogLevelCoalescedValue.warning:
      return '#D6BF57';
    case LogLevelCoalescedValue.error:
      return '#DF9352';
    case LogLevelCoalescedValue.critical:
      return '#E7664C';
    case LogLevelCoalescedValue.alert:
      return '#DA5E47';
    case LogLevelCoalescedValue.emergency:
    case LogLevelCoalescedValue.fatal:
      return '#CC5642';
    default:
      return '#D3DAE6';
  }
};
