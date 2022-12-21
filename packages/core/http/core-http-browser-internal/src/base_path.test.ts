/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BasePath } from './base_path';

describe('BasePath', () => {
  describe('#get()', () => {
    it('returns an empty string if no basePath not provided', () => {
      expect(new BasePath().get()).toBe('');
    });

    it('returns basePath value if provided', () => {
      expect(new BasePath('/foo').get()).toBe('/foo');
    });

    describe('#prepend()', () => {
      it('adds the base path to the path if it is relative and starts with a slash', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.prepend('/a/b')).toBe('/foo/bar/a/b');
      });

      it('leaves the query string and hash of path unchanged', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.prepend('/a/b?x=y#c/d/e')).toBe('/foo/bar/a/b?x=y#c/d/e');
      });

      it('returns the path unchanged if it does not start with a slash', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.prepend('a/b')).toBe('a/b');
      });

      it('returns the path unchanged it it has a hostname', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.prepend('http://localhost:5601/a/b')).toBe('http://localhost:5601/a/b');
      });
    });

    describe('#remove()', () => {
      it('removes the basePath if relative path starts with it', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.remove('/foo/bar/a/b')).toBe('/a/b');
      });

      it('leaves query string and hash intact', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.remove('/foo/bar/a/b?c=y#1234')).toBe('/a/b?c=y#1234');
      });

      it('ignores urls with hostnames', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.remove('http://localhost:5601/foo/bar/a/b')).toBe(
          'http://localhost:5601/foo/bar/a/b'
        );
      });

      it('returns slash if path is just basePath', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.remove('/foo/bar')).toBe('/');
      });

      it('returns full path if basePath is not its own segment', () => {
        const basePath = new BasePath('/foo/bar');

        expect(basePath.remove('/foo/barhop')).toBe('/foo/barhop');
      });
    });
  });

  describe('serverBasePath', () => {
    it('defaults to basePath', () => {
      expect(new BasePath('/foo/bar').serverBasePath).toEqual('/foo/bar');
    });

    it('returns value when passed into constructor', () => {
      expect(new BasePath('/foo/bar', '/foo').serverBasePath).toEqual('/foo');
    });
  });

  describe('publicBaseUrl', () => {
    it('returns value passed into construtor', () => {
      expect(new BasePath('/foo/bar', '/foo').publicBaseUrl).toEqual(undefined);
      expect(new BasePath('/foo/bar', '/foo', 'http://myhost.com/foo').publicBaseUrl).toEqual(
        'http://myhost.com/foo'
      );
    });
  });
});
