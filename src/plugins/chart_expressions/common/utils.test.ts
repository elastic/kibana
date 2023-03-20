/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getOverridesFor } from './utils';

describe('Overrides utilities', () => {
  describe('getOverridesFor', () => {
    it('should return an empty object for undefined values', () => {
      expect(getOverridesFor(undefined, 'settings')).toEqual({});
      // @ts-expect-error
      expect(getOverridesFor({}, 'settings')).toEqual({});
      // @ts-expect-error
      expect(getOverridesFor({ otherOverride: {} }, 'settings')).toEqual({});
    });

    it('should return only the component specific overrides', () => {
      expect(
        getOverridesFor({ otherOverride: { a: 15 }, settings: { b: 10 } }, 'settings')
      ).toEqual({ b: 10 });
    });

    it('should swap any "ignore" value into undefined value', () => {
      expect(
        getOverridesFor({ otherOverride: { a: 15 }, settings: { b: 10, c: 'ignore' } }, 'settings')
      ).toEqual({ b: 10, c: undefined });
    });
  });
});
