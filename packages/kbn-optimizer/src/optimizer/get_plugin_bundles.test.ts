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

expect.addSnapshotSerializer(createAbsolutePathSerializer('/repo'));

it('returns a bundle for core and each plugin', () => {
  expect(
    getPluginBundles(
      [
        {
          directory: '/repo/plugins/foo',
          id: 'foo',
          isUiPlugin: true,
          extraPublicDirs: [],
        },
        {
          directory: '/repo/plugins/bar',
          id: 'bar',
          isUiPlugin: false,
          extraPublicDirs: [],
        },
        {
          directory: '/outside/of/repo/plugins/baz',
          id: 'baz',
          isUiPlugin: true,
          extraPublicDirs: [],
        },
      ],
      '/repo'
    ).map((b) => b.toSpec())
  ).toMatchInlineSnapshot(`
    Array [
      Object {
        "contextDir": <absolute path>/plugins/foo,
        "id": "foo",
        "outputDir": <absolute path>/plugins/foo/target/public,
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <absolute path>,
        "type": "plugin",
      },
      Object {
        "contextDir": "/outside/of/repo/plugins/baz",
        "id": "baz",
        "outputDir": "/outside/of/repo/plugins/baz/target/public",
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": <absolute path>,
        "type": "plugin",
      },
    ]
  `);
});
