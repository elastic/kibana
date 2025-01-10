/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getLogLevelColor } from './get_log_level_color';
import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

const euiTheme = {
  colors: {
    mediumShade: '#d3dae6',
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
      '#e18774'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.critical, euiTheme as EuiThemeComputed)).toBe(
      '#dd7b67'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.alert, euiTheme as EuiThemeComputed)).toBe(
      '#d76f5b'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.emergency, euiTheme as EuiThemeComputed)).toBe(
      '#d2634e'
    );
    // other
    expect(getLogLevelColor(LogLevelCoalescedValue.trace, euiTheme as EuiThemeComputed)).toBe(
      '#d3dae6'
    );
  });
});
