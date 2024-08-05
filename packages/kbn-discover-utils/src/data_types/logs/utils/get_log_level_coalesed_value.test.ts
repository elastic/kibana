/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getLogLevelCoalescedValue,
  getLogLevelCoalescedValueLabel,
  LogLevelCoalescedValue,
} from './get_log_level_coalesed_value';

describe('getLogLevelCoalescedValue', () => {
  test('should work correctly', () => {
    expect(getLogLevelCoalescedValue('trace')).toBe(LogLevelCoalescedValue.trace);
    expect(getLogLevelCoalescedValue('debug')).toBe(LogLevelCoalescedValue.debug);
    expect(getLogLevelCoalescedValue('info')).toBe(LogLevelCoalescedValue.info);
    expect(getLogLevelCoalescedValue('notice')).toBe(LogLevelCoalescedValue.notice);
    expect(getLogLevelCoalescedValue('warn')).toBe(LogLevelCoalescedValue.warning);
    expect(getLogLevelCoalescedValue('warning')).toBe(LogLevelCoalescedValue.warning);
    expect(getLogLevelCoalescedValue('err')).toBe(LogLevelCoalescedValue.error);
    expect(getLogLevelCoalescedValue('error')).toBe(LogLevelCoalescedValue.error);
    expect(getLogLevelCoalescedValue('ERROR')).toBe(LogLevelCoalescedValue.error);
    expect(getLogLevelCoalescedValue('crit')).toBe(LogLevelCoalescedValue.critical);
    expect(getLogLevelCoalescedValue('critical')).toBe(LogLevelCoalescedValue.critical);
    expect(getLogLevelCoalescedValue('sev')).toBe(LogLevelCoalescedValue.critical);
    expect(getLogLevelCoalescedValue('alert')).toBe(LogLevelCoalescedValue.alert);
    expect(getLogLevelCoalescedValue('emer')).toBe(LogLevelCoalescedValue.emergency);
    expect(getLogLevelCoalescedValue('emergency')).toBe(LogLevelCoalescedValue.emergency);
    expect(getLogLevelCoalescedValue('fatal')).toBe(LogLevelCoalescedValue.fatal);
    expect(getLogLevelCoalescedValue('other unknown value')).toBe(undefined);

    expect(getLogLevelCoalescedValueLabel(LogLevelCoalescedValue.error)).toBe('Error');
  });
});
