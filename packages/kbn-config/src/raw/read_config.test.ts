/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative, resolve } from 'path';
import { getConfigFromFiles } from './read_config';

const fixtureFile = (name: string) => resolve(`${__dirname}/../__fixtures__/${name}`);

test('reads single yaml from file system and parses to json', () => {
  const config = getConfigFromFiles([fixtureFile('config.yml')]);

  expect(config).toMatchSnapshot();
});

test('returns a deep object', () => {
  const config = getConfigFromFiles([fixtureFile('/config_flat.yml')]);

  expect(config).toMatchSnapshot();
});

test('reads and merges multiple yaml files from file system and parses to json', () => {
  const config = getConfigFromFiles([fixtureFile('/one.yml'), fixtureFile('/two.yml')]);

  expect(config).toMatchSnapshot();
});

test('should inject an environment variable value when setting a value with ${ENV_VAR}', () => {
  process.env.KBN_ENV_VAR1 = 'val1';
  process.env.KBN_ENV_VAR2 = 'val2';

  const config = getConfigFromFiles([fixtureFile('/en_var_ref_config.yml')]);

  delete process.env.KBN_ENV_VAR1;
  delete process.env.KBN_ENV_VAR2;

  expect(config).toMatchSnapshot();
});

test('should inject an environment variable in a nested list of objects', () => {
  process.env.KBN_ENV_VAR1 = 'val1';
  process.env.KBN_ENV_VAR2 = 'val2';

  const config = getConfigFromFiles([fixtureFile('/en_var_ref_config_nested.yml')]);

  delete process.env.KBN_ENV_VAR1;
  delete process.env.KBN_ENV_VAR2;

  expect(config).toMatchSnapshot();
});

test('should throw an exception when referenced environment variable in a config value does not exist', () => {
  expect(() =>
    getConfigFromFiles([fixtureFile('/en_var_ref_config.yml')])
  ).toThrowErrorMatchingSnapshot();
});

test('throws parsing a config with forbidden paths', () => {
  expect(() =>
    getConfigFromFiles([fixtureFile('forbidden_1.yml')])
  ).toThrowErrorMatchingInlineSnapshot(`"Forbidden path detected: test.aaa['__proto__.hello']"`);
});

test('throws parsing another config with forbidden paths', () => {
  expect(() =>
    getConfigFromFiles([fixtureFile('forbidden_2.yml')])
  ).toThrowErrorMatchingInlineSnapshot(`"Forbidden path detected: test.hello.__proto__.dolly"`);
});

test('merging two configs', () => {
  const config = getConfigFromFiles([fixtureFile('merge_1.yml'), fixtureFile('merge_2.yml')]);
  expect(config).toMatchSnapshot();
});

describe('different cwd()', () => {
  const originalCwd = process.cwd();
  const tempCwd = resolve(__dirname);

  beforeAll(() => process.chdir(tempCwd));
  afterAll(() => process.chdir(originalCwd));

  test('resolves relative files based on the cwd', () => {
    const relativePath = relative(tempCwd, fixtureFile('/one.yml'));
    const config = getConfigFromFiles([relativePath]);

    expect(config).toMatchSnapshot();
  });

  test('fails to load relative paths, not found because of the cwd', () => {
    const relativePath = relative(resolve(__dirname, '../../'), fixtureFile('/one.yml'));
    expect(() => getConfigFromFiles([relativePath])).toThrowError(/ENOENT/);
  });
});

test('supports unsplittable key syntax', () => {
  const config = getConfigFromFiles([fixtureFile('/unsplittable_1.yml')]);

  expect(config).toMatchInlineSnapshot(`
    Object {
      "bar": 3,
      "foo": 1,
      "foo.bar": "foobar",
      "nested": Object {
        "a.b": "ab",
        "str1": "foo",
      },
    }
  `);
});

test('supports unsplittable key syntax on nested list', () => {
  const config = getConfigFromFiles([fixtureFile('/unsplittable_2.yml')]);

  expect(config).toMatchInlineSnapshot(`
    Object {
      "foo.bar": "foobar",
      "list": Array [
        Object {
          "a.b": Array [
            "foo",
            "bar",
          ],
          "id": "id1",
        },
      ],
    }
  `);
});

test('supports unsplittable key syntax on nested list with splittable subkeys', () => {
  const config = getConfigFromFiles([fixtureFile('/unsplittable_3.yml')]);

  expect(config).toMatchInlineSnapshot(`
    Object {
      "foo.bar": "foobar",
      "list": Array [
        Object {
          "a.b": Array [
            "foo",
            "bar",
          ],
          "id": "id1",
          "test": Object {
            "this": Object {
              "out": Array [
                "foo",
                "bar",
              ],
            },
          },
        },
      ],
    }
  `);
});

test('supports var:default syntax', () => {
  process.env.KBN_ENV_VAR1 = 'val1';

  const config = getConfigFromFiles([fixtureFile('/en_var_with_defaults.yml')]);

  delete process.env.KBN_ENV_VAR1;

  expect(config).toMatchInlineSnapshot(`
    Object {
      "foo": "pre-val1-mid-default2-post",
      "nested_list": Array [
        Object {
          "id": "a",
          "values": Array [
            "val1",
            "default2",
          ],
        },
      ],
    }
  `);
});
