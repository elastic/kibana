/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getThemeStylesheetPaths, getCommonStylesheetPaths, getScriptPaths } from './render_utils';

describe('getScriptPaths', () => {
  it('returns the correct list when darkMode is `system`', () => {
    expect(
      getScriptPaths({
        baseHref: '/base-path',
        buildNum: 17,
        darkMode: 'system',
      })
    ).toEqual(['/base-path/ui/legacy_theme.js']);
  });

  it('returns the correct list when darkMode is `true`', () => {
    expect(
      getScriptPaths({
        baseHref: '/base-path',
        buildNum: 17,
        darkMode: true,
      })
    ).toEqual([]);
  });

  it('returns the correct list when darkMode is `false`', () => {
    expect(
      getScriptPaths({
        baseHref: '/base-path',
        buildNum: 17,
        darkMode: false,
      })
    ).toEqual([]);
  });
});

describe('getCommonStylesheetPaths', () => {
  it('returns the correct list', () => {
    expect(
      getCommonStylesheetPaths({
        baseHref: '/base-path',
        buildNum: 17,
      })
    ).toMatchInlineSnapshot(`
      Array [
        "/base-path/17/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.css",
        "/base-path/ui/legacy_styles.css",
      ]
    `);
  });
});

describe('getStylesheetPaths', () => {
  describe('when darkMode is `true`', () => {
    describe('when themeVersion is `v8`', () => {
      it('returns the correct list', () => {
        expect(
          getThemeStylesheetPaths({
            darkMode: true,
            themeVersion: 'v8',
            baseHref: '/base-path',
            buildNum: 17,
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/17/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.v8.dark.css",
            "/base-path/ui/legacy_dark_theme.min.css",
          ]
        `);
      });
    });
  });
  describe('when darkMode is `false`', () => {
    describe('when themeVersion is `v8`', () => {
      it('returns the correct list', () => {
        expect(
          getThemeStylesheetPaths({
            darkMode: false,
            themeVersion: 'v8',
            baseHref: '/base-path',
            buildNum: 69,
          })
        ).toMatchInlineSnapshot(`
          Array [
            "/base-path/69/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.v8.light.css",
            "/base-path/ui/legacy_light_theme.min.css",
          ]
        `);
      });
    });
  });
});
