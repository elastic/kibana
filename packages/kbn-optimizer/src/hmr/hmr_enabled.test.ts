/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isHmrEnabled } from './hmr_enabled';

const base = { watch: true, dist: false, profile: false };

describe('isHmrEnabled', () => {
  describe('auto-detection (no explicit flag or env)', () => {
    it('returns true in watch + dev mode', () => {
      expect(isHmrEnabled({ ...base })).toBe(true);
    });

    it('returns false when watch=false', () => {
      expect(isHmrEnabled({ ...base, watch: false })).toBe(false);
    });

    it('returns false when dist=true', () => {
      expect(isHmrEnabled({ ...base, dist: true })).toBe(false);
    });

    it('returns false when profile=true', () => {
      expect(isHmrEnabled({ ...base, profile: true })).toBe(false);
    });

    it('returns false when both dist and profile are true', () => {
      expect(isHmrEnabled({ ...base, dist: true, profile: true })).toBe(false);
    });
  });

  describe('CLI flag (hmrFlag)', () => {
    it('hmrFlag=false disables HMR even in watch dev mode', () => {
      expect(isHmrEnabled({ ...base, hmrFlag: false })).toBe(false);
    });

    it('hmrFlag=true enables HMR in watch dev mode', () => {
      expect(isHmrEnabled({ ...base, hmrFlag: true })).toBe(true);
    });

    it('hmrFlag=true cannot force HMR in non-watch mode', () => {
      expect(isHmrEnabled({ ...base, watch: false, hmrFlag: true })).toBe(false);
    });

    it('hmrFlag=true cannot force HMR in dist mode', () => {
      expect(isHmrEnabled({ ...base, dist: true, hmrFlag: true })).toBe(false);
    });

    it('hmrFlag=true cannot force HMR in profile mode', () => {
      expect(isHmrEnabled({ ...base, profile: true, hmrFlag: true })).toBe(false);
    });
  });

  describe('KBN_HMR environment variable', () => {
    it('KBN_HMR=false disables HMR', () => {
      expect(isHmrEnabled({ ...base, kbnHmrEnv: 'false' })).toBe(false);
    });

    it('KBN_HMR=true does not override auto-detection (treated as truthy)', () => {
      expect(isHmrEnabled({ ...base, kbnHmrEnv: 'true' })).toBe(true);
    });

    it('CLI flag=true overrides KBN_HMR=false', () => {
      expect(isHmrEnabled({ ...base, hmrFlag: true, kbnHmrEnv: 'false' })).toBe(true);
    });

    it('CLI flag=false wins over KBN_HMR=true', () => {
      expect(isHmrEnabled({ ...base, hmrFlag: false, kbnHmrEnv: 'true' })).toBe(false);
    });
  });
});
