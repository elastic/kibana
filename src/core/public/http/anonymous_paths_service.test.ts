/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnonymousPathsService } from './anonymous_paths_service';
import { BasePath } from './base_path';

describe('#setup()', () => {
  describe('#register', () => {
    it(`allows paths that don't start with /`, () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('bar');
    });

    it(`allows paths that end with '/'`, () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar/');
    });
  });

  describe('#isAnonymous', () => {
    it('returns true for registered paths', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
    });

    it('returns true for paths registered with a trailing slash, but call "isAnonymous" with no trailing slash', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar/');
      expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
    });

    it('returns true for paths registered without a trailing slash, but call "isAnonymous" with a trailing slash', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('/foo/bar/')).toBe(true);
    });

    it('returns true for paths registered without a starting slash', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('bar');
      expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
    });

    it('returns true for paths registered with a starting slash', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
    });

    it('when there is no basePath and calling "isAnonymous" without a starting slash, returns true for paths registered with a starting slash', () => {
      const basePath = new BasePath('/');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('bar')).toBe(true);
    });

    it('when there is no basePath and calling "isAnonymous" with a starting slash, returns true for paths registered with a starting slash', () => {
      const basePath = new BasePath('/');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('/bar')).toBe(true);
    });

    it('returns true for paths whose capitalization is different', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/BAR');
      expect(anonymousPaths.isAnonymous('/foo/bar')).toBe(true);
    });

    it('returns false for other paths', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('/foo/foo')).toBe(false);
    });

    it('returns false for sub-paths of registered paths', () => {
      const basePath = new BasePath('/foo');
      const anonymousPaths = new AnonymousPathsService().setup({ basePath });
      anonymousPaths.register('/bar');
      expect(anonymousPaths.isAnonymous('/foo/bar/baz')).toBe(false);
    });
  });
});
