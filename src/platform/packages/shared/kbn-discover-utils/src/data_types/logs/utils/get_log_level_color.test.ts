/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeComputed } from '@elastic/eui';
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
      '#bdd7ff'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.info, euiTheme as EuiThemeComputed)).toBe(
      '#90bdff'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.notice, euiTheme as EuiThemeComputed)).toBe(
      '#61a2ff'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.warning, euiTheme as EuiThemeComputed)).toBe(
      '#fcd883'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.error, euiTheme as EuiThemeComputed)).toBe(
      '#fc9a92'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.critical, euiTheme as EuiThemeComputed)).toBe(
      '#fb9188'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.alert, euiTheme as EuiThemeComputed)).toBe(
      '#fa877e'
    );
    expect(getLogLevelColor(LogLevelCoalescedValue.emergency, euiTheme as EuiThemeComputed)).toBe(
      '#f87c74'
    );
    // other
    expect(getLogLevelColor(LogLevelCoalescedValue.trace, euiTheme as EuiThemeComputed)).toBe(
      '#d3dae6'
    );
  });
});
