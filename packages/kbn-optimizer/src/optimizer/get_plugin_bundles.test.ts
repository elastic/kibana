/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
        },
        {
          directory: '/repo/plugins/bar',
          id: 'bar',
          isUiPlugin: false,
          extraPublicDirs: [],
          manifestPath: '/repo/plugins/bar/kibana.json',
        },
        {
          directory: '/outside/of/repo/plugins/baz',
          id: 'baz',
          isUiPlugin: true,
          extraPublicDirs: [],
          manifestPath: '/outside/of/repo/plugins/baz/kibana.json',
        },
        {
          directory: '/repo/x-pack/plugins/box',
          id: 'box',
          isUiPlugin: true,
          extraPublicDirs: [],
          manifestPath: '/repo/x-pack/plugins/box/kibana.json',
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
        "manifestPath": <repoRoot>/plugins/foo/kibana.json,
        "outputDir": <outputRoot>/plugins/foo/target/public,
        "pageLoadAssetSizeLimit": undefined,
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
      Object {
        "banner": undefined,
        "contextDir": <outsideOfRepo>/plugins/baz,
        "id": "baz",
        "manifestPath": <outsideOfRepo>/plugins/baz/kibana.json,
        "outputDir": <outsideOfRepo>/plugins/baz/target/public,
        "pageLoadAssetSizeLimit": undefined,
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
      Object {
        "banner": "/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements. 
     * Licensed under the Elastic License 2.0; you may not use this file except in compliance with the Elastic License 2.0. */
    ",
        "contextDir": <repoRoot>/x-pack/plugins/box,
        "id": "box",
        "manifestPath": <repoRoot>/x-pack/plugins/box/kibana.json,
        "outputDir": <outputRoot>/x-pack/plugins/box/target/public,
        "pageLoadAssetSizeLimit": 123,
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
    ]
  `);
});
