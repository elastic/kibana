/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { getFlags, FlagsReader } from '@kbn/dev-cli-runner';
import { createAnyInstanceSerializer, createAbsolutePathSerializer } from '@kbn/jest-serializers';
import { REPO_ROOT } from '@kbn/repo-info';

import { EsVersion } from '../../functional_test_runner';
import { parseFlags, FLAG_OPTIONS } from './flags';

jest.mock('uuid', () => ({ v4: () => 'some-uuid' }));

const cwdMock = (process.cwd = jest.fn().mockReturnValue(REPO_ROOT));

expect.addSnapshotSerializer(
  createAnyInstanceSerializer(EsVersion, (v: EsVersion) => `EsVersion ${v.toString()}`)
);
expect.addSnapshotSerializer(createAbsolutePathSerializer());

const defaults = getFlags(['--config=foo'], FLAG_OPTIONS);

const test = (opts: Record<string, string | string[] | boolean | undefined>) =>
  parseFlags(new FlagsReader({ ...defaults, ...opts }));

beforeEach(() => {
  cwdMock.mockReturnValue(REPO_ROOT);
});

it('parses a subset of the flags from runTests', () => {
  expect(test({ config: 'foo' })).toMatchInlineSnapshot(`
    Object {
      "config": <absolute path>/foo,
      "esFrom": undefined,
      "esVersion": <EsVersion 9.9.9>,
      "installDir": undefined,
      "logsDir": undefined,
    }
  `);
});

it('respects the cwd of the script', () => {
  cwdMock.mockReturnValue(Path.resolve(REPO_ROOT, 'x-pack'));
  expect(test({ config: 'foo' })).toMatchInlineSnapshot(`
    Object {
      "config": <absolute path>/x-pack/foo,
      "esFrom": undefined,
      "esVersion": <EsVersion 9.9.9>,
      "installDir": undefined,
      "logsDir": undefined,
    }
  `);
});

it('rejects zero configs', () => {
  expect(() => test({ config: [] })).toThrowErrorMatchingInlineSnapshot(
    `"expected exactly one --config or --journey flag"`
  );
});

it('rejects two configs', () => {
  expect(() => test({ config: ['foo'], journey: ['bar'] })).toThrowErrorMatchingInlineSnapshot(
    `"expected exactly one --config or --journey flag"`
  );
});

it('supports logsDir', () => {
  expect(test({ logToFile: true }).logsDir).toMatchInlineSnapshot(
    `<absolute path>/data/ftr_servers_logs/some-uuid`
  );
});
