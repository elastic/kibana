/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addProfile, getProfile } from './utils';

describe('Discover customization utils', () => {
  describe('addProfile', () => {
    it('should add profile to path', () => {
      expect(addProfile('/root', 'test')).toEqual('/root/p/test');
    });

    it('should add profile to path with trailing slash', () => {
      expect(addProfile('/root/', 'test')).toEqual('/root/p/test/');
    });

    it('should trim path', () => {
      expect(addProfile(' /root ', 'test')).toEqual('/root/p/test');
    });

    it('should work with empty path', () => {
      expect(addProfile('', 'test')).toEqual('/p/test');
    });
  });

  describe('getProfile', () => {
    it('should return profile from path', () => {
      expect(getProfile('/p/test/subpath')).toEqual({
        profile: 'test',
        isProfileRootPath: false,
      });
    });

    it('should return profile from path with trailing slash', () => {
      expect(getProfile('/p/test/subpath/')).toEqual({
        profile: 'test',
        isProfileRootPath: false,
      });
    });

    it('should return profile from root path', () => {
      expect(getProfile('/p/test')).toEqual({
        profile: 'test',
        isProfileRootPath: true,
      });
    });

    it('should return profile from root path with trailing slash', () => {
      expect(getProfile('/p/test/')).toEqual({
        profile: 'test',
        isProfileRootPath: true,
      });
    });

    it('should return undefined if profile is not in path', () => {
      expect(getProfile('/root')).toEqual({
        profile: undefined,
        isProfileRootPath: false,
      });
    });

    it('should return undefined if path is empty', () => {
      expect(getProfile('')).toEqual({
        profile: undefined,
        isProfileRootPath: false,
      });
    });
  });
});
