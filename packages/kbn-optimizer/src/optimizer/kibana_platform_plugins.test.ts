/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { findKibanaPlatformPlugins } from './kibana_platform_plugins';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const FIXTURES_PATH = Path.resolve(__dirname, '../__fixtures__');

it('parses kibana.json files of plugins found in pluginDirs', () => {
  expect(
    findKibanaPlatformPlugins(
      [Path.resolve(FIXTURES_PATH, 'mock_repo/plugins')],
      [Path.resolve(FIXTURES_PATH, 'mock_repo/test_plugins/test_baz')]
    )
  ).toMatchInlineSnapshot(`
    Array [
      Object {
        "directory": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/plugins/bar,
        "extraPublicDirs": Array [],
        "id": "bar",
        "isUiPlugin": true,
        "manifestPath": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/plugins/bar/kibana.json,
      },
      Object {
        "directory": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/plugins/foo,
        "extraPublicDirs": Array [],
        "id": "foo",
        "isUiPlugin": true,
        "manifestPath": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/plugins/foo/kibana.json,
      },
      Object {
        "directory": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/plugins/nested/baz,
        "extraPublicDirs": Array [],
        "id": "baz",
        "isUiPlugin": false,
        "manifestPath": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/plugins/nested/baz/kibana.json,
      },
      Object {
        "directory": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/test_plugins/test_baz,
        "extraPublicDirs": Array [],
        "id": "test_baz",
        "isUiPlugin": false,
        "manifestPath": <absolute path>/packages/kbn-optimizer/src/__fixtures__/mock_repo/test_plugins/test_baz/kibana.json,
      },
    ]
  `);
});
