/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStylesheetPaths } from './render_utils';

describe('getStylesheetPaths', () => {
  describe('when darkMode is `true`', () => {
    describe('when themeVersion is `v7`', () => {
      it('returns the correct list', () => {
        expect(
          getStylesheetPaths({
            darkMode: true,
            themeVersion: 'v7',
            basePath: '/base-path',
            buildNum: 9000,
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/9000/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/9000/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v7.dark.css",
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
            buildNum: 17,
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/17/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/17/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v8.dark.css",
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
            buildNum: 42,
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/42/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/42/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v7.light.css",
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
            buildNum: 69,
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/69/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.css",
            "/base-path/69/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.v8.light.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_light.css",
            "/base-path/ui/legacy_light_theme.css",
          ]
        `);
      });
    });
  });
});
