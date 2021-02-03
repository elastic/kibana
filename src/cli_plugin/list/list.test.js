/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

import del from 'del';

import { list } from './list';

function createPlugin(name, version, pluginBaseDir) {
  const pluginDir = join(pluginBaseDir, name);
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    join(pluginDir, 'kibana.json'),
    JSON.stringify({
      id: name,
      version,
    })
  );
}

const logger = {
  messages: [],
  log(msg) {
    this.messages.push(`log: ${msg}`);
  },
  error(msg) {
    this.messages.push(`error: ${msg}`);
  },
};

describe('kibana cli', function () {
  describe('plugin lister', function () {
    const pluginDir = join(__dirname, '.test.data.list');

    beforeEach(function () {
      logger.messages.length = 0;
      del.sync(pluginDir);
      mkdirSync(pluginDir, { recursive: true });
    });

    afterEach(function () {
      del.sync(pluginDir);
    });

    it('list all of the folders in the plugin folder, ignoring dot prefixed plugins and regular files', function () {
      createPlugin('.foo', '1.0.0', pluginDir);
      createPlugin('plugin1', '5.0.0-alpha2', pluginDir);
      createPlugin('plugin2', '3.2.1', pluginDir);
      createPlugin('plugin3', '1.2.3', pluginDir);
      createPlugin('.bar', '1.0.0', pluginDir);
      writeFileSync(join(pluginDir, 'plugin4'), 'This is a file, and not a folder.');

      list(pluginDir, logger);

      expect(logger.messages).toMatchInlineSnapshot(`
        Array [
          "log: plugin1@5.0.0-alpha2",
          "log: plugin2@3.2.1",
          "log: plugin3@1.2.3",
          "log: ",
        ]
      `);
    });

    it('list should throw an exception if a plugin does not have a package.json', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      mkdirSync(join(pluginDir, 'empty-plugin'), { recursive: true });

      expect(function () {
        list(pluginDir, logger);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Unable to read kibana.json file for plugin empty-plugin"`
      );
    });

    it('list should throw an exception if a plugin have an empty package.json', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      const invalidPluginDir = join(pluginDir, 'invalid-plugin');
      mkdirSync(invalidPluginDir, { recursive: true });
      writeFileSync(join(invalidPluginDir, 'package.json'), '');

      expect(function () {
        list(pluginDir, logger);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Unable to read kibana.json file for plugin invalid-plugin"`
      );
    });
  });
});
