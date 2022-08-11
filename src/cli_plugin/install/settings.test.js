/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAbsolutePathSerializer } from '@kbn/jest-serializers';
import { fromRoot } from '@kbn/utils';

import { parseMilliseconds, parse } from './settings';

const SECOND = 1000;
const MINUTE = SECOND * 60;

expect.addSnapshotSerializer(createAbsolutePathSerializer());

describe('parseMilliseconds function', function () {
  it.each([
    ['', 0],
    ['1gigablasts', 0],
    [1, 1],
    ['1', 1],
    ['5s', 5 * SECOND],
    ['5second', 5 * SECOND],
    ['5seconds', 5 * SECOND],
    ['9m', 9 * MINUTE],
    ['9minute', 9 * MINUTE],
    ['9minutes', 9 * MINUTE],
  ])('should parse %j to %j', (input, result) => {
    expect(parseMilliseconds(input)).toBe(result);
  });
});

describe('parse function', function () {
  const command = 'plugin name';
  const defaultOptions = { pluginDir: fromRoot('plugins') };
  const kbnPackage = { version: 1234 };

  it('produces expected defaults', function () {
    expect(parse(command, { ...defaultOptions }, kbnPackage)).toMatchInlineSnapshot(`
      Object {
        "config": "",
        "plugin": "plugin name",
        "pluginDir": <absolute path>/plugins,
        "quiet": false,
        "silent": false,
        "tempArchiveFile": <absolute path>/plugins/.plugin.installing/archive.part,
        "timeout": 0,
        "urls": Array [
          "plugin name",
          "https://artifacts.elastic.co/downloads/kibana-plugins/plugin name/plugin name-1234.zip",
        ],
        "version": 1234,
        "workingPath": <absolute path>/plugins/.plugin.installing,
      }
    `);
  });

  it('consumes overrides', function () {
    const options = {
      quiet: true,
      silent: true,
      config: 'foo bar baz',
      ...defaultOptions,
    };

    expect(parse(command, options, kbnPackage)).toMatchInlineSnapshot(`
      Object {
        "config": "foo bar baz",
        "plugin": "plugin name",
        "pluginDir": <absolute path>/plugins,
        "quiet": true,
        "silent": true,
        "tempArchiveFile": <absolute path>/plugins/.plugin.installing/archive.part,
        "timeout": 0,
        "urls": Array [
          "plugin name",
          "https://artifacts.elastic.co/downloads/kibana-plugins/plugin name/plugin name-1234.zip",
        ],
        "version": 1234,
        "workingPath": <absolute path>/plugins/.plugin.installing,
      }
    `);
  });
});
