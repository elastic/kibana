/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { testPatternAgainstAllowedList } from './test_pattern_against_allowed_list';

describe('testPatternAgainstAllowedList', () => {
  const allowedList = ['foo-logs-bar', /^\b(logs)\b([^,\s]*)/i];

  it('should return true if the passed input matches any string or regexp of the passed list', () => {
    expect(testPatternAgainstAllowedList(allowedList)('logs-*')).toBeTruthy();
    expect(testPatternAgainstAllowedList(allowedList)('logs-*-*')).toBeTruthy();
    expect(testPatternAgainstAllowedList(allowedList)('logs-system.syslog-*')).toBeTruthy();
    expect(testPatternAgainstAllowedList(allowedList)('foo-logs-bar')).toBeTruthy();

    expect(testPatternAgainstAllowedList(allowedList)('logss-*')).toBeFalsy();
    expect(testPatternAgainstAllowedList(allowedList)('metrics*')).toBeFalsy();
    expect(testPatternAgainstAllowedList(allowedList)('metrics-*')).toBeFalsy();
  });
});
