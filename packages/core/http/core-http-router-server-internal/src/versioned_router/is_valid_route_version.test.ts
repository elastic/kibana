/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isValidRouteVersion } from './is_valid_route_version';

describe('isValidRouteVersion', () => {
  describe('public', () => {
    test('valid dates "true"', () => {
      expect(isValidRouteVersion(true, '2010-02-01')).toBe(true);
    });
    test.each([['2020.02.01'], [''], ['abc']])('%p returns "false"', (value: string) => {
      expect(isValidRouteVersion(true, value)).toBe(false);
    });
  });
  describe('internal', () => {
    test('valid numbers return "true"', () => {
      expect(isValidRouteVersion(false, '1')).toBe(true);
    });

    test.each([['1.1'], [''], ['abc']])('%p returns "false"', (value: string) => {
      expect(isValidRouteVersion(false, value)).toBe(false);
    });
  });
});
