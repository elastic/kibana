/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAbsolutePathSerializer, createAnyInstanceSerializer } from '@kbn/jest-serializers';
import { Flags } from '@kbn/dev-cli-runner';

import { EsVersion } from '../../functional_test_runner';
import { parseFlags } from './flags';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(
  createAnyInstanceSerializer(EsVersion, (v: EsVersion) => `EsVersion ${v.toString()}`)
);

const INITIAL_TEST_ES_FROM = process.env.TEST_ES_FROM;
beforeEach(() => {
  process.env.TEST_ES_FROM = 'snapshot';
});
afterEach(() => {
  process.env.TEST_ES_FROM = INITIAL_TEST_ES_FROM;
});

const defaults = {
  _: [],
  debug: false,
  help: false,
  quiet: false,
  silent: false,
  unexpected: [],
  verbose: false,
  config: 'foo',
} as Flags;

describe('parse runTest flags', () => {
  it('validates defaults', () => {
    expect(parseFlags(defaults)).toMatchInlineSnapshot(`
      Object {
        "bail": false,
        "configs": Array [
          <absolute path>/foo,
        ],
        "dryRun": false,
        "esFrom": undefined,
        "esVersion": <EsVersion 9.9.9>,
        "grep": undefined,
        "installDir": undefined,
        "logsDir": undefined,
        "suiteFilters": Object {
          "exclude": Array [],
          "include": Array [],
        },
        "suiteTags": Object {
          "exclude": Array [],
          "include": Array [],
        },
        "updateBaselines": false,
        "updateSnapshots": false,
      }
    `);
  });

  it('allows combinations of config and journey', () => {
    expect(() => parseFlags({ ...defaults, config: undefined })).toThrowErrorMatchingInlineSnapshot(
      `"At least one --config or --journey flag is required"`
    );

    expect(parseFlags({ ...defaults, config: ['configFoo'], journey: 'journeyFoo' }).configs)
      .toMatchInlineSnapshot(`
      Array [
        <absolute path>/configFoo,
        <absolute path>/journeyFoo,
      ]
    `);

    expect(parseFlags({ ...defaults, config: undefined, journey: 'foo' }).configs)
      .toMatchInlineSnapshot(`
      Array [
        <absolute path>/foo,
      ]
    `);

    expect(parseFlags({ ...defaults, config: undefined, journey: ['foo', 'bar', 'baz'] }).configs)
      .toMatchInlineSnapshot(`
      Array [
        <absolute path>/foo,
        <absolute path>/bar,
        <absolute path>/baz,
      ]
    `);

    expect(parseFlags({ ...defaults, config: ['bar'], journey: ['foo', 'baz'] }).configs)
      .toMatchInlineSnapshot(`
      Array [
        <absolute path>/bar,
        <absolute path>/foo,
        <absolute path>/baz,
      ]
    `);
  });

  it('updates all with updateAll', () => {
    const { updateBaselines, updateSnapshots } = parseFlags({ ...defaults, updateAll: true });
    expect({ updateBaselines, updateSnapshots }).toMatchInlineSnapshot(`
      Object {
        "updateBaselines": true,
        "updateSnapshots": true,
      }
    `);
  });

  it('validates esFrom', () => {
    expect(() => parseFlags({ ...defaults, esFrom: 'foo' })).toThrowErrorMatchingInlineSnapshot(
      `"invalid --esFrom, expected either \\"snapshot\\" or \\"source\\""`
    );
  });

  it('accepts multiple tags', () => {
    const { suiteFilters, suiteTags } = parseFlags({
      ...defaults,
      'include-tag': ['foo', 'bar'],
      include: 'path',
      exclude: ['foo'],
      'exclude-tag': ['foo'],
    });
    expect({ suiteFilters, suiteTags }).toMatchInlineSnapshot(`
      Object {
        "suiteFilters": Object {
          "exclude": Array [
            "foo",
          ],
          "include": Array [
            "path",
          ],
        },
        "suiteTags": Object {
          "exclude": Array [
            "foo",
          ],
          "include": Array [
            "foo",
            "bar",
          ],
        },
      }
    `);
  });
});
