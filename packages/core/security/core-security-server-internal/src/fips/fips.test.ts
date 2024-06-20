/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SecurityServiceConfigType } from '../utils';
import { isFipsEnabled } from './fips';

describe('fips', () => {
  describe('#isFipsEnabled', () => {
    let config: SecurityServiceConfigType;

    beforeAll(() => {
      config = {};
    });

    afterEach(() => {
      config = {};
    });

    it('should return `true` if config.experimental.fipsMode.enabled is `true`', () => {
      config = { experimental: { fipsMode: { enabled: true } } };

      expect(isFipsEnabled(config)).toBe(true);
    });

    it('should return `false` if config.experimental.fipsMode.enabled is `false`', () => {
      config = { experimental: { fipsMode: { enabled: false } } };

      expect(isFipsEnabled(config)).toBe(false);
    });

    it('should return `false` if config.experimental.fipsMode.enabled is `undefined`', () => {
      expect(isFipsEnabled(config)).toBe(false);
    });
  });
});
