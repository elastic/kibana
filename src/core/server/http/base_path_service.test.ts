/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BasePath } from './base_path_service';
import { KibanaRequest } from './router';
import { httpServerMock } from './http_server.mocks';

describe('BasePath', () => {
  describe('serverBasePath', () => {
    it('defaults to an empty string', () => {
      const basePath = new BasePath();
      expect(basePath.serverBasePath).toBe('');
    });

    it('returns the server base path', () => {
      const basePath = new BasePath('/server');
      expect(basePath.serverBasePath).toBe('/server');
    });
  });

  describe('publicBaseUrl', () => {
    it('defaults to an undefined', () => {
      const basePath = new BasePath();
      expect(basePath.publicBaseUrl).toBe(undefined);
    });

    it('returns the publicBaseUrl', () => {
      const basePath = new BasePath('/server', 'http://myhost.com/server');
      expect(basePath.publicBaseUrl).toBe('http://myhost.com/server');
    });
  });

  describe('#get()', () => {
    it('returns base path associated with an incoming Legacy.Request request', () => {
      const request = httpServerMock.createRawRequest();

      const basePath = new BasePath();
      basePath.set(request, '/baz/');
      expect(basePath.get(request)).toBe('/baz/');
    });

    it('returns base path associated with an incoming KibanaRequest', () => {
      const request = httpServerMock.createRawRequest();
      const basePath = new BasePath();

      basePath.set(KibanaRequest.from(request, undefined), '/baz/');
      expect(basePath.get(KibanaRequest.from(request, undefined))).toBe('/baz/');
    });

    it('operates with both Legacy.Request/KibanaRequest requests', () => {
      const request = httpServerMock.createRawRequest();
      const basePath = new BasePath();

      basePath.set(request, '/baz/');
      expect(basePath.get(KibanaRequest.from(request, undefined))).toBe('/baz/');
    });

    it('is based on server base path', () => {
      const request = httpServerMock.createRawRequest();
      const basePath = new BasePath('/foo/bar');

      basePath.set(request, '/baz/');
      expect(basePath.get(request)).toBe('/foo/bar/baz/');
    });
  });

  describe('#set()', () => {
    it('#set() cannot be set twice for one request', () => {
      const request = httpServerMock.createRawRequest();
      const basePath = new BasePath('/foo/bar');

      const setPath = () => basePath.set(request, 'baz/');
      setPath();

      expect(setPath).toThrowErrorMatchingInlineSnapshot(
        `"Request basePath was previously set. Setting multiple times is not supported."`
      );
    });
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
