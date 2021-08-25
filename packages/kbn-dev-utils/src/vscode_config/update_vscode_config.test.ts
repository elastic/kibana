/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import dedent from 'dedent';

import { updateVscodeConfig } from './update_vscode_config';
import { createReplaceSerializer } from '../serializers';
import { ManagedConfigKey } from './managed_config_keys';

// avoid excessive escaping in snapshots
expect.addSnapshotSerializer({ test: (v) => typeof v === 'string', print: (v) => `${v}` });
expect.addSnapshotSerializer(createReplaceSerializer(REPO_ROOT, '<repo>'));

const TEST_KEYS: ManagedConfigKey[] = [
  {
    key: 'foo',
    value: 100,
  },
  {
    key: 'bar',
    value: 'bar value',
  },
  {
    key: 'complex',
    value: {
      hello: true,
      world: [1, 2, 3],
    },
  },
];

const run = (json?: string) => updateVscodeConfig(TEST_KEYS, json);

it('updates the passed JSON with the managed settings', () => {
  expect(run(`{}`)).toMatchInlineSnapshot(`
    /**
     * @managed
     *
     * The following keys in this file are managed by @kbn/dev-utils:
     *   - foo
     *   - bar
     *   - complex
     *
     * To disable this place the text "// SELF MANAGED" at the top of this file.
     */
    {
      "foo": 100,
      "bar": "bar value",
      "complex": {
        "hello": true,
        "world": [1, 2, 3]
      }
    }

  `);
});

it('initialized empty or undefined json values', () => {
  expect(run('')).toMatchInlineSnapshot(`
    /**
     * @managed
     *
     * The following keys in this file are managed by @kbn/dev-utils:
     *   - foo
     *   - bar
     *   - complex
     *
     * To disable this place the text "// SELF MANAGED" at the top of this file.
     */
    {
      "foo": 100,
      "bar": "bar value",
      "complex": {
        "hello": true,
        "world": [1, 2, 3]
      }
    }

  `);

  expect(run()).toMatchInlineSnapshot(`
    /**
     * @managed
     *
     * The following keys in this file are managed by @kbn/dev-utils:
     *   - foo
     *   - bar
     *   - complex
     *
     * To disable this place the text "// SELF MANAGED" at the top of this file.
     */
    {
      "foo": 100,
      "bar": "bar value",
      "complex": {
        "hello": true,
        "world": [1, 2, 3]
      }
    }

  `);
});

it(`throws if the JSON file doesn't contain an object`, () => {
  expect(() => run('[]')).toThrowErrorMatchingInlineSnapshot(
    `expected VSCode config to contain a JSON object`
  );
  expect(() => run('1')).toThrowErrorMatchingInlineSnapshot(
    `expected VSCode config to contain a JSON object`
  );
  expect(() => run('"foo"')).toThrowErrorMatchingInlineSnapshot(
    `expected VSCode config to contain a JSON object`
  );
});

it('persists comments in the original file', () => {
  const newJson = run(`
    /**
     * This is a top level comment
     */
    {
      "a": "bar",
      // this is just test data
      "b": "box"
    }
  `);
  expect(newJson).toMatchInlineSnapshot(`
    /**
     * @managed
     *
     * The following keys in this file are managed by @kbn/dev-utils:
     *   - foo
     *   - bar
     *   - complex
     *
     * To disable this place the text "// SELF MANAGED" at the top of this file.
     */

    /**
     * This is a top level comment
     */
    {
      "a": "bar",
      // this is just test data
      "b": "box",
      "foo": 100,
      "bar": "bar value",
      "complex": {
        "hello": true,
        "world": [1, 2, 3]
      }
    }

  `);
});

it('overrides old values for managed keys', () => {
  const newJson = run(`
    {
      "foo": 0,
      "bar": "some other config",
      "complex": "some other config",
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    /**
     * @managed
     *
     * The following keys in this file are managed by @kbn/dev-utils:
     *   - foo
     *   - bar
     *   - complex
     *
     * To disable this place the text "// SELF MANAGED" at the top of this file.
     */
    {
      "foo": 100,
      "bar": "bar value",
      "complex": {
        "hello": true,
        "world": [1, 2, 3]
      }
    }

  `);
});

it('does not modify files starting with // SELF MANAGED', () => {
  const newJson = run(dedent`
    // SELF MANAGED
    {
      "invalid": "I know what I am doing",
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // SELF MANAGED
    {
      "invalid": "I know what I am doing",
    }
  `);
});
