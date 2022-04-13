/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { App } from '../types';
import { BasePath } from '../../http/base_path';
import { parseAppUrl } from './parse_app_url';

describe('parseAppUrl', () => {
  let apps: Map<string, App<any>>;
  let basePath: BasePath;

  const currentUrl =
    'https://kibana.local:8080/base-path/app/current/current-path?current-query=true';

  const createApp = (props: Partial<App>): App => {
    const app: App = {
      id: 'some-id',
      title: 'some-title',
      mount: () => () => undefined,
      ...props,
    };
    apps.set(app.id, app);
    return app;
  };

  beforeEach(() => {
    apps = new Map();
    basePath = new BasePath('/base-path');

    createApp({
      id: 'foo',
    });
    createApp({
      id: 'bar',
      appRoute: '/custom-bar',
    });
    createApp({
      id: 're',
    });
    createApp({
      id: 'retail',
    });
  });

  describe('with absolute paths', () => {
    it('parses the app id', () => {
      expect(parseAppUrl('/base-path/app/foo', basePath, apps, currentUrl)).toEqual({
        app: 'foo',
        path: undefined,
      });
      expect(parseAppUrl('/base-path/custom-bar', basePath, apps, currentUrl)).toEqual({
        app: 'bar',
        path: undefined,
      });
      expect(parseAppUrl('/base-path/app/re', basePath, apps, currentUrl)).toEqual({
        app: 're',
        path: undefined,
      });
      expect(parseAppUrl('/base-path/app/retail', basePath, apps, currentUrl)).toEqual({
        app: 'retail',
        path: undefined,
      });
    });
    it('parses the path', () => {
      expect(parseAppUrl('/base-path/app/foo/some/path', basePath, apps, currentUrl)).toEqual({
        app: 'foo',
        path: '/some/path',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/another/path/', basePath, apps, currentUrl)
      ).toEqual({
        app: 'bar',
        path: '/another/path/',
      });
      expect(parseAppUrl('/base-path/app/re/tail', basePath, apps, currentUrl)).toEqual({
        app: 're',
        path: '/tail',
      });
      expect(parseAppUrl('/base-path/app/retail/path', basePath, apps, currentUrl)).toEqual({
        app: 'retail',
        path: '/path',
      });
    });
    it('includes query and hash in the path for default app route', () => {
      expect(parseAppUrl('/base-path/app/foo#hash/bang', basePath, apps, currentUrl)).toEqual({
        app: 'foo',
        path: '#hash/bang',
      });
      expect(parseAppUrl('/base-path/app/foo?hello=dolly', basePath, apps, currentUrl)).toEqual({
        app: 'foo',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl('/base-path/app/foo/path?hello=dolly', basePath, apps, currentUrl)
      ).toEqual({
        app: 'foo',
        path: '/path?hello=dolly',
      });
      expect(parseAppUrl('/base-path/app/foo/path#hash/bang', basePath, apps, currentUrl)).toEqual({
        app: 'foo',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl('/base-path/app/foo/path#hash/bang?hello=dolly', basePath, apps, currentUrl)
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang?hello=dolly',
      });
      expect(parseAppUrl('/base-path/app/re#hash/bang', basePath, apps, currentUrl)).toEqual({
        app: 're',
        path: '#hash/bang',
      });
      expect(parseAppUrl('/base-path/app/retail?hello=dolly', basePath, apps, currentUrl)).toEqual({
        app: 'retail',
        path: '?hello=dolly',
      });
      expect(parseAppUrl('/base-path/app/retail#hash/bang', basePath, apps, currentUrl)).toEqual({
        app: 'retail',
        path: '#hash/bang',
      });
    });
    it('includes query and hash in the path for custom app route', () => {
      expect(parseAppUrl('/base-path/custom-bar#hash/bang', basePath, apps, currentUrl)).toEqual({
        app: 'bar',
        path: '#hash/bang',
      });
      expect(parseAppUrl('/base-path/custom-bar?hello=dolly', basePath, apps, currentUrl)).toEqual({
        app: 'bar',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/path?hello=dolly', basePath, apps, currentUrl)
      ).toEqual({
        app: 'bar',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/path#hash/bang', basePath, apps, currentUrl)
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl('/base-path/custom-bar/path#hash/bang?hello=dolly', basePath, apps, currentUrl)
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('returns undefined when the app is not known', () => {
      expect(parseAppUrl('/base-path/app/non-registered', basePath, apps, currentUrl)).toEqual(
        undefined
      );
      expect(parseAppUrl('/base-path/unknown-path', basePath, apps, currentUrl)).toEqual(undefined);
    });
    it('returns undefined when the path does not start with the base path', () => {
      expect(parseAppUrl('/app/foo', basePath, apps, currentUrl)).toBeUndefined();
    });
  });

  describe('with relative paths', () => {
    it('works with sibling relative urls', () => {
      expect(
        parseAppUrl('./foo', basePath, apps, 'https://kibana.local:8080/base-path/app/current')
      ).toEqual({
        app: 'foo',
        path: undefined,
      });
    });
    it('works with parent relative urls', () => {
      expect(
        parseAppUrl(
          '../custom-bar',
          basePath,
          apps,
          'https://kibana.local:8080/base-path/app/current'
        )
      ).toEqual({
        app: 'bar',
        path: undefined,
      });
    });
    it('works with nested parents', () => {
      expect(
        parseAppUrl(
          '../../custom-bar',
          basePath,
          apps,
          'https://kibana.local:8080/base-path/app/current/some-path'
        )
      ).toEqual({
        app: 'bar',
        path: undefined,
      });
    });
    it('parses the path', () => {
      expect(
        parseAppUrl(
          './foo/path?hello=dolly',
          basePath,
          apps,
          'https://kibana.local:8080/base-path/app/current'
        )
      ).toEqual({
        app: 'foo',
        path: '/path?hello=dolly',
      });
    });
    it('parses the path with query and hash', () => {
      expect(
        parseAppUrl(
          '../custom-bar/path#hash?hello=dolly',
          basePath,
          apps,
          'https://kibana.local:8080/base-path/app/current'
        )
      ).toEqual({
        app: 'bar',
        path: '/path#hash?hello=dolly',
      });
    });
    it('returns undefined if the relative path redirect outside of the basePath', () => {
      expect(
        parseAppUrl(
          '../../custom-bar',
          basePath,
          apps,
          'https://kibana.local:8080/base-path/app/current'
        )
      ).toBeUndefined();
    });
    it('works with inclusive app ids', () => {
      expect(
        parseAppUrl(
          './retail/path',
          basePath,
          apps,
          'https://kibana.local:8080/base-path/app/current'
        )
      ).toEqual({
        app: 'retail',
        path: '/path',
      });
    });
  });

  describe('with absolute urls', () => {
    it('parses the app id', () => {
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo', basePath, apps, currentUrl)
      ).toEqual({
        app: 'foo',
        path: undefined,
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/custom-bar', basePath, apps, currentUrl)
      ).toEqual({
        app: 'bar',
        path: undefined,
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/re', basePath, apps, currentUrl)
      ).toEqual({
        app: 're',
        path: undefined,
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/retail', basePath, apps, currentUrl)
      ).toEqual({
        app: 'retail',
        path: undefined,
      });
    });
    it('parses the path', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/some/path',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'foo',
        path: '/some/path',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/another/path/',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'bar',
        path: '/another/path/',
      });

      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/re/some/path',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 're',
        path: '/some/path',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/retail/another/path/',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'retail',
        path: '/another/path/',
      });
    });
    it('includes query and hash in the path for default app routes', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo#hash/bang',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'foo',
        path: '#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'foo',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'foo',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path#hash/bang',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path#hash/bang?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/re#hash/bang',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 're',
        path: '#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/re?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 're',
        path: '?hello=dolly',
      });
    });
    it('includes query and hash in the path for custom app route', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar#hash/bang',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'bar',
        path: '#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'bar',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/path?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'bar',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/path#hash/bang',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/custom-bar/path#hash/bang?hello=dolly',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual({
        app: 'bar',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('returns undefined when the app is not known', () => {
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/non-registered',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual(undefined);
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/unknown-path', basePath, apps, currentUrl)
      ).toEqual(undefined);
    });
    it('returns undefined when origin does not match', () => {
      expect(
        parseAppUrl(
          'https://other-kibana.external:8080/base-path/app/foo',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual(undefined);
      expect(
        parseAppUrl(
          'https://other-kibana.external:8080/base-path/custom-bar',
          basePath,
          apps,
          currentUrl
        )
      ).toEqual(undefined);
    });
    it('returns undefined when the path does not contain the base path', () => {
      expect(parseAppUrl('https://kibana.local:8080/app/foo', basePath, apps, currentUrl)).toEqual(
        undefined
      );
    });
  });
});
