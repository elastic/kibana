/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
