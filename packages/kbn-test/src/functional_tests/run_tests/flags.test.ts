/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAbsolutePathSerializer, createAnyInstanceSerializer } from '@kbn/jest-serializers';
import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';

import { EsVersion } from '../../functional_test_runner';
import { parseFlags, FLAG_OPTIONS } from './flags';

jest.mock('uuid', () => ({ v4: () => 'some-uuid' }));

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

const defaults = getFlags(['--config=foo'], FLAG_OPTIONS);

const test = (opts: Record<string, string | string[] | boolean | undefined>) =>
  parseFlags(new FlagsReader({ ...defaults, ...opts }));

describe('parse runTest flags', () => {
  it('validates defaults', () => {
    expect(test({})).toMatchInlineSnapshot(`
      Object {
        "bail": false,
        "configs": Array [
          <absolute path>/foo,
        ],
        "dryRun": false,
        "esFrom": "snapshot",
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
    expect(() => test({ config: undefined })).toThrowErrorMatchingInlineSnapshot(
      `"At least one --config or --journey flag is required"`
    );

    expect(test({ config: ['configFoo'], journey: 'journeyFoo' }).configs).toMatchInlineSnapshot(`
      Array [
        <absolute path>/configFoo,
        <absolute path>/journeyFoo,
      ]
    `);

    expect(test({ config: undefined, journey: 'foo' }).configs).toMatchInlineSnapshot(`
      Array [
        <absolute path>/foo,
      ]
    `);

    expect(test({ config: undefined, journey: ['foo', 'bar', 'baz'] }).configs)
      .toMatchInlineSnapshot(`
      Array [
        <absolute path>/foo,
        <absolute path>/bar,
        <absolute path>/baz,
      ]
    `);

    expect(test({ config: ['bar'], journey: ['foo', 'baz'] }).configs).toMatchInlineSnapshot(`
      Array [
        <absolute path>/bar,
        <absolute path>/foo,
        <absolute path>/baz,
      ]
    `);
  });

  it('updates all with updateAll', () => {
    const { updateBaselines, updateSnapshots } = test({ updateAll: true });
    expect({ updateBaselines, updateSnapshots }).toMatchInlineSnapshot(`
      Object {
        "updateBaselines": true,
        "updateSnapshots": true,
      }
    `);
  });

  it('validates esFrom', () => {
    expect(() => test({ esFrom: 'foo' })).toThrowErrorMatchingInlineSnapshot(
      `"invalid --esFrom, expected one of \\"snapshot\\", \\"source\\""`
    );
  });

  it('accepts multiple tags', () => {
    const { suiteFilters, suiteTags } = test({
      'include-tag': ['foo', 'bar'],
      include: 'path',
      exclude: ['foo'],
      'exclude-tag': ['foo'],
    });

    expect({ suiteFilters, suiteTags }).toMatchInlineSnapshot(`
      Object {
        "suiteFilters": Object {
          "exclude": Array [
            <absolute path>/foo,
          ],
          "include": Array [
            <absolute path>/path,
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

it('supports logsDir', () => {
  expect(test({ logToFile: true }).logsDir).toMatchInlineSnapshot(
    `<absolute path>/data/ftr_servers_logs/some-uuid`
  );
});
