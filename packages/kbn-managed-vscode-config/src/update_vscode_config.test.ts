/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

import { updateVscodeConfig } from './update_vscode_config';
import { ManagedConfigKey } from './managed_config_keys';

// avoid excessive escaping in snapshots
expect.addSnapshotSerializer({ test: (v) => typeof v === 'string', print: (v) => `${v}` });

const TEST_KEYS: ManagedConfigKey[] = [
  {
    key: 'key',
    value: {
      hello: true,
      world: [1, 2, 3],
    },
  },
  {
    key: 'stringKey',
    value: 'foo',
  },
  {
    key: 'arrayKey',
    value: ['foo', 'bar'],
  },
];

const run = async (json?: string) => await updateVscodeConfig(TEST_KEYS, '', json);

it('updates the passed JSON with the managed settings', async () => {
  expect(await run(`{}`)).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('initialized empty or undefined json values', async () => {
  expect(await run('')).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);

  expect(await run()).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('replaces conflicting managed keys which do not have matching value types', async () => {
  expect(await run(`{ "key": false, "stringKey": { "a": "B" } }`)).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it(`throws if the JSON file doesn't contain an object`, async () => {
  expect(async () => await run('[]')).toThrowErrorMatchingInlineSnapshot(
    `expected VSCode config to contain a JSON object`
  );
  expect(async () => await run('1')).toThrowErrorMatchingInlineSnapshot(
    `expected VSCode config to contain a JSON object`
  );
  expect(async () => await run('"foo"')).toThrowErrorMatchingInlineSnapshot(
    `expected VSCode config to contain a JSON object`
  );
});

it('persists comments in the original file', async () => {
  const newJson = await run(`
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
    // @managed
    /**
     * This is a top level comment
     */
    {
      "a": "bar",
      // this is just test data
      "b": "box",
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('overrides old values for managed keys', async () => {
  const newJson = await run(`
    {
      "foo": 0,
      "bar": "some other config",
      "complex": "some other config",
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      "foo": 0,
      "bar": "some other config",
      "complex": "some other config",
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('does not modify files starting with // SELF MANAGED', async () => {
  const newJson = await run(dedent`
    // self managed
    {
      "invalid": "I know what I am doing",
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // self managed
    {
      "invalid": "I know what I am doing",
    }
  `);
});

it('does not modify properties with leading `// self managed` comment', async () => {
  const newJson = await run(dedent`
    {
      // self managed
      "key": {
        "world": [5]
      },
      // self managed
      "stringKey": "--"
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      // self managed
      "key": {
        "world": [5]
      },
      // self managed
      "stringKey": "--",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('does not modify child properties with leading `// self managed` comment', async () => {
  const newJson = await run(dedent`
    {
      "key": {
        // self managed
        "world": [5]
      }
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // self managed
        "world": [5],
        // @managed
        "hello": true
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('does not modify unknown child properties', async () => {
  const newJson = await run(dedent`
    {
      "key": {
        "foo": "bar",
        // self managed
        "world": [5],
      }
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        "foo": "bar",
        // self managed
        "world": [5],
        // @managed
        "hello": true
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('removes managed properties which are no longer managed', async () => {
  const newJson = await run(dedent`
    {
      "key": {
        // @managed
        "foo": "bar",
        // self managed
        "world": [5],
      }
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // self managed
        "world": [5],
        // @managed
        "hello": true
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('wipes out child keys which conflict with newly managed child keys', async () => {
  const newJson = await run(dedent`
    {
      "key": {
        // some user specified comment
        "world": [5],
      }
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('correctly formats info text when specified', async () => {
  const newJson = await updateVscodeConfig(TEST_KEYS, 'info users\nshould know', `{}`);

  expect(newJson).toMatchInlineSnapshot(`
    /**
     * @managed
     *
     * info users
     * should know
     */
    {
      "key": {
        // @managed
        "hello": true,
        // @managed
        "world": [1, 2, 3]
      },
      // @managed
      "stringKey": "foo",
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});

it('allows "// self managed" comments conflicting with "// @managed" comments to win', async () => {
  const newJson = await run(dedent`
    {
      "key": {
        // @managed
        // self managed
        "hello": ["world"]
      },
      // @managed
      // self managed
      "stringKey": 12345
    }
  `);

  expect(newJson).toMatchInlineSnapshot(`
    // @managed
    {
      "key": {
        // self managed
        "hello": ["world"],
        // @managed
        "world": [1, 2, 3]
      },
      // self managed
      "stringKey": 12345,
      // @managed
      "arrayKey": ["foo", "bar"]
    }

  `);
});
