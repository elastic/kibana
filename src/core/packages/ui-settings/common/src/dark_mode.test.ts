/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDarkModeValue } from './dark_mode';

describe('parseDarkModeValue', () => {
  it('should return true when rawValue is true or "true" or "enabled"', () => {
    expect(parseDarkModeValue(true)).toBe(true);
    expect(parseDarkModeValue('true')).toBe(true);
    expect(parseDarkModeValue('enabled')).toBe(true);
  });

  it('should return false when rawValue is false or "false" or "disabled"', () => {
    expect(parseDarkModeValue(false)).toBe(false);
    expect(parseDarkModeValue('false')).toBe(false);
    expect(parseDarkModeValue('disabled')).toBe(false);
  });

  it('should return "system" when rawValue is "system"', () => {
    expect(parseDarkModeValue('system')).toBe('system');
  });

  it('should return Boolean(rawValue) when rawValue is not one of the predefined values', () => {
    expect(parseDarkModeValue('randomText')).toBe(true);
    expect(parseDarkModeValue('')).toBe(false);
  });
});
