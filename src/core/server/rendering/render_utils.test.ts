/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStylesheetPaths } from './render_utils';

describe('getStylesheetPaths', () => {
  describe('when themeVersion is `v8`', () => {
    it('returns the correct list', () => {
      expect(
        getStylesheetPaths({
          themeVersion: 'v8',
          basePath: '/base-path',
          buildNum: 17,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "dark": Array [
            "/base-path/17/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.v8.dark.css",
            "/base-path/17/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_dark.css",
            "/base-path/ui/legacy_dark_theme.css",
          ],
          "light": Array [
            "/base-path/17/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.v8.light.css",
            "/base-path/17/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.css",
            "/base-path/node_modules/@kbn/ui-framework/dist/kui_light.css",
            "/base-path/ui/legacy_light_theme.css",
          ],
        }
      `);
    });
  });
});
