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

import { createAbsolutePathSerializer } from '@kbn/dev-utils';

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
      '/output'
    ).map((b) => b.toSpec())
  ).toMatchInlineSnapshot(`
    Array [
      Object {
        "banner": undefined,
        "contextDir": <repoRoot>/plugins/foo,
        "id": "foo",
        "manifestPath": <repoRoot>/plugins/foo/kibana.json,
        "outputDir": <outputRoot>/plugins/foo/target/public,
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
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
      Object {
        "banner": "/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
     * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
    ",
        "contextDir": <repoRoot>/x-pack/plugins/box,
        "id": "box",
        "manifestPath": <repoRoot>/x-pack/plugins/box/kibana.json,
        "outputDir": <outputRoot>/x-pack/plugins/box/target/public,
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <repoRoot>,
        "type": "plugin",
      },
    ]
  `);
});
