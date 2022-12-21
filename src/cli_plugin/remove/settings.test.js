/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { parse } from './settings';

const command = 'plugin name';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

it('produces the defaults', () => {
  expect(parse(command, {})).toMatchInlineSnapshot(`
    Object {
      "config": "",
      "plugin": "plugin name",
      "pluginDir": <absolute path>/plugins,
      "pluginPath": <absolute path>/plugins/plugin name,
      "quiet": false,
      "silent": false,
    }
  `);
});

it('overrides the defaults with the parsed cli options', () => {
  expect(
    parse(command, {
      quiet: true,
      silent: true,
      config: 'foo/bar',
    })
  ).toMatchInlineSnapshot(`
    Object {
      "config": "foo/bar",
      "plugin": "plugin name",
      "pluginDir": <absolute path>/plugins,
      "pluginPath": <absolute path>/plugins/plugin name,
      "quiet": true,
      "silent": true,
    }
  `);
});
