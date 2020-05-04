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

import { parseAppUrl } from './parse_app_url';
import { LegacyApp, App } from './types';
import { BasePath } from '../http/base_path';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getOrigin: () => 'https://kibana.local:8080',
}));

describe('parseAppUrl', () => {
  let apps: Map<string, App<any> | LegacyApp>;
  let basePath: BasePath;

  const createApp = (props: Partial<App>): App => {
    const app: App = {
      id: 'some-id',
      title: 'some-title',
      mount: () => () => undefined,
      ...props,
      legacy: false,
    };
    apps.set(app.id, app);
    return app;
  };

  const createLegacyApp = (props: Partial<LegacyApp>): LegacyApp => {
    const app: LegacyApp = {
      id: 'some-id',
      title: 'some-title',
      appUrl: '/my-url',
      ...props,
      legacy: true,
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
    createLegacyApp({
      id: 'legacy',
      appUrl: '/app/legacy',
    });
  });

  describe('with relative paths', () => {
    it('parses the app id', () => {
      expect(parseAppUrl('/base-path/app/foo', basePath, apps)).toEqual({
        app: 'foo',
        path: undefined,
      });
      expect(parseAppUrl('/base-path/custom-bar', basePath, apps)).toEqual({
        app: 'bar',
        path: undefined,
      });
    });
    it('parses the path', () => {
      expect(parseAppUrl('/base-path/app/foo/some/path', basePath, apps)).toEqual({
        app: 'foo',
        path: '/some/path',
      });
      expect(parseAppUrl('/base-path/custom-bar/another/path/', basePath, apps)).toEqual({
        app: 'bar',
        path: '/another/path/',
      });
    });
    it('includes query and hash in the path', () => {
      expect(parseAppUrl('/base-path/app/foo#hash/bang', basePath, apps)).toEqual({
        app: 'foo',
        path: '#hash/bang',
      });
      expect(parseAppUrl('/base-path/app/foo?hello=dolly', basePath, apps)).toEqual({
        app: 'foo',
        path: '?hello=dolly',
      });
      expect(parseAppUrl('/base-path/app/foo/path?hello=dolly', basePath, apps)).toEqual({
        app: 'foo',
        path: '/path?hello=dolly',
      });
      expect(parseAppUrl('/base-path/app/foo/path#hash/bang', basePath, apps)).toEqual({
        app: 'foo',
        path: '/path#hash/bang',
      });
      expect(parseAppUrl('/base-path/app/foo/path#hash/bang?hello=dolly', basePath, apps)).toEqual({
        app: 'foo',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('works with legacy apps', () => {
      expect(parseAppUrl('/base-path/app/legacy', basePath, apps)).toEqual({
        app: 'legacy',
        path: undefined,
      });
      expect(parseAppUrl('/base-path/app/legacy/path#hash?query=bar', basePath, apps)).toEqual({
        app: 'legacy',
        path: '/path#hash?query=bar',
      });
    });
    it('returns undefined when the app is not known', () => {
      expect(parseAppUrl('/base-path/app/non-registered', basePath, apps)).toEqual(undefined);
      expect(parseAppUrl('/base-path/unknown-path', basePath, apps)).toEqual(undefined);
    });
  });

  describe('with absolute urls', () => {
    it('parses the app id', () => {
      expect(parseAppUrl('https://kibana.local:8080/base-path/app/foo', basePath, apps)).toEqual({
        app: 'foo',
        path: undefined,
      });
      expect(parseAppUrl('https://kibana.local:8080/base-path/custom-bar', basePath, apps)).toEqual(
        {
          app: 'bar',
          path: undefined,
        }
      );
    });
    it('parses the path', () => {
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo/some/path', basePath, apps)
      ).toEqual({
        app: 'foo',
        path: '/some/path',
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/custom-bar/another/path/', basePath, apps)
      ).toEqual({
        app: 'bar',
        path: '/another/path/',
      });
    });
    it('includes query and hash in the path', () => {
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo#hash/bang', basePath, apps)
      ).toEqual({
        app: 'foo',
        path: '#hash/bang',
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo?hello=dolly', basePath, apps)
      ).toEqual({
        app: 'foo',
        path: '?hello=dolly',
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo/path?hello=dolly', basePath, apps)
      ).toEqual({
        app: 'foo',
        path: '/path?hello=dolly',
      });
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/foo/path#hash/bang', basePath, apps)
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang',
      });
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/foo/path#hash/bang?hello=dolly',
          basePath,
          apps
        )
      ).toEqual({
        app: 'foo',
        path: '/path#hash/bang?hello=dolly',
      });
    });
    it('works with legacy apps', () => {
      expect(parseAppUrl('https://kibana.local:8080/base-path/app/legacy', basePath, apps)).toEqual(
        {
          app: 'legacy',
          path: undefined,
        }
      );
      expect(
        parseAppUrl(
          'https://kibana.local:8080/base-path/app/legacy/path#hash?query=bar',
          basePath,
          apps
        )
      ).toEqual({
        app: 'legacy',
        path: '/path#hash?query=bar',
      });
    });
    it('returns undefined when the app is not known', () => {
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/app/non-registered', basePath, apps)
      ).toEqual(undefined);
      expect(
        parseAppUrl('https://kibana.local:8080/base-path/unknown-path', basePath, apps)
      ).toEqual(undefined);
    });
  });
});
