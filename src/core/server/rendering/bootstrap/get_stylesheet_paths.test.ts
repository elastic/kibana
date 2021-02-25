/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStylesheetPaths } from './get_stylesheet_paths';

describe('getStylesheetPaths', () => {
  describe('when darkMode is `true`', () => {
    describe('when themeVersion is `v7`', () => {
      it('returns the correct list', () => {
        expect(
          getStylesheetPaths({
            darkMode: true,
            themeVersion: 'v7',
            basePath: '/base-path',
            regularBundlePath: '/base-path/bundles',
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v7.dark.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_dark.css",
            "/base-path/ui/legacy_dark_theme.css",
          ]
        `);
      });
    });
    describe('when themeVersion is `v8`', () => {
      it('returns the correct list', () => {
        expect(
          getStylesheetPaths({
            darkMode: true,
            themeVersion: 'v8',
            basePath: '/base-path',
            regularBundlePath: '/base-path/bundles',
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v8.dark.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_dark.css",
            "/base-path/ui/legacy_dark_theme.css",
          ]
        `);
      });
    });
  });
  describe('when darkMode is `false`', () => {
    describe('when themeVersion is `v7`', () => {
      it('returns the correct list', () => {
        expect(
          getStylesheetPaths({
            darkMode: false,
            themeVersion: 'v7',
            basePath: '/base-path',
            regularBundlePath: '/base-path/bundles',
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v7.light.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_light.css",
            "/base-path/ui/legacy_light_theme.css",
          ]
        `);
      });
    });
    describe('when themeVersion is `v8`', () => {
      it('returns the correct list', () => {
        expect(
          getStylesheetPaths({
            darkMode: false,
            themeVersion: 'v8',
            basePath: '/base-path',
            regularBundlePath: '/base-path/bundles',
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v8.light.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_light.css",
            "/base-path/ui/legacy_light_theme.css",
          ]
        `);
      });
    });
  });
});
