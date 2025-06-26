/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { getPluginBundles } from './get_plugin_bundles';

expect.addSnapshotSerializer(createAbsolutePathSerializer('/repo', '<repoRoot>'));
expect.addSnapshotSerializer(createAbsolutePathSerializer('/output', '<outputRoot>'));
expect.addSnapshotSerializer(createAbsolutePathSerializer('/outside/of/repo', '<outsideOfRepo>'));

it('returns a bundle for core and each plugin', () => {
  expect(
    getPluginBundles(
      [
        {
          directory: '/repo/plugins/foo',
          id: 'foo',
          isUiPlugin: true,
          extraPublicDirs: [],
          manifestPath: '/repo/plugins/foo/kibana.json',
          pkgId: '@kbn/foo-plugin',
          ignoreMetrics: false,
        },
        {
          directory: '/repo/plugins/bar',
          id: 'bar',
          isUiPlugin: false,
          extraPublicDirs: [],
          manifestPath: '/repo/plugins/bar/kibana.json',
          pkgId: '@kbn/bar-plugin',
          ignoreMetrics: false,
        },
        {
          directory: '/outside/of/repo/plugins/baz',
          id: 'baz',
          isUiPlugin: true,
          extraPublicDirs: [],
          manifestPath: '/outside/of/repo/plugins/baz/kibana.json',
          pkgId: '@kbn/external-baz-plugin',
          ignoreMetrics: false,
        },
        {
          directory: '/repo/x-pack/plugins/box',
          id: 'box',
          isUiPlugin: true,
          extraPublicDirs: [],
          manifestPath: '/repo/x-pack/plugins/box/kibana.json',
          pkgId: '@kbn/box-plugin',
          ignoreMetrics: false,
        },
      ],

      '/repo',
      '/output',
      {
        pageLoadAssetSize: {
          box: 123,
        },
      }
    ).map((b) => b.toSpec())
  ).toMatchInlineSnapshot(`
    Array [
      Object {
        "banner": undefined,
        "contextDir": <repoRoot>/plugins/foo,
        "id": "foo",
        "ignoreMetrics": false,
        "manifestPath": <repoRoot>/plugins/foo/kibana.json,
        "outputDir": <outputRoot>/plugins/foo/target/public,
        "pageLoadAssetSizeLimit": undefined,
        "remoteInfo": Object {
          "pkgId": "@kbn/foo-plugin",
          "targets": Array [
            "public",
          ],
        },
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
      Object {
        "banner": undefined,
        "contextDir": <outsideOfRepo>/plugins/baz,
        "id": "baz",
        "ignoreMetrics": false,
        "manifestPath": <outsideOfRepo>/plugins/baz/kibana.json,
        "outputDir": <outsideOfRepo>/plugins/baz/target/public,
        "pageLoadAssetSizeLimit": undefined,
        "remoteInfo": Object {
          "pkgId": "@kbn/external-baz-plugin",
          "targets": Array [
            "public",
          ],
        },
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
      Object {
        "banner": "/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
     * Licensed under the Elastic License 2.0; you may not use this file except in compliance with the Elastic License 2.0. */
    ",
        "contextDir": <repoRoot>/x-pack/plugins/box,
        "id": "box",
        "ignoreMetrics": false,
        "manifestPath": <repoRoot>/x-pack/plugins/box/kibana.json,
        "outputDir": <outputRoot>/x-pack/plugins/box/target/public,
        "pageLoadAssetSizeLimit": 123,
        "remoteInfo": Object {
          "pkgId": "@kbn/box-plugin",
          "targets": Array [
            "public",
          ],
        },
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
    ]
  `);
});
