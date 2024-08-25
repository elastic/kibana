/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { getLogLevelColor } from './get_log_level_color';
import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

const euiTheme = {
  colors: {
    lightShade: '#ffffff',
  },
};

describe('getLogLevelColor', () => {
  test('should work correctly', () => {
    expect(getLogLevelColor(LogLevelCoalescedValue.debug, euiTheme as EuiThemeComputed)).toBe(
      '#becfe3'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.info, euiTheme as EuiThemeComputed)).toBe(
      '#90b0d1'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.notice, euiTheme as EuiThemeComputed)).toBe(
      '#6092c0'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.warning, euiTheme as EuiThemeComputed)).toBe(
      '#d6bf57'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.error, euiTheme as EuiThemeComputed)).toBe(
      '#df9352'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.critical, euiTheme as EuiThemeComputed)).toBe(
      '#e7664c'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.alert, euiTheme as EuiThemeComputed)).toBe(
      '#da5e47'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.emergency, euiTheme as EuiThemeComputed)).toBe(
      '#cc5642'
    );
    // other
    expect(getLogLevelColor(LogLevelCoalescedValue.trace, euiTheme as EuiThemeComputed)).toBe(
      '#ffffff'
    );
  });
});
