/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAnyInstanceSerializer, createAbsolutePathSerializer } from '@kbn/jest-serializers';
import { Flags } from '@kbn/dev-cli-runner';
import { EsVersion } from '../../functional_test_runner';
import { parseFlags } from './flags';

expect.addSnapshotSerializer(
  createAnyInstanceSerializer(EsVersion, (v: EsVersion) => `EsVersion ${v.toString()}`)
);
expect.addSnapshotSerializer(createAbsolutePathSerializer());

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

it('parses a subset of the flags from runTests', () => {
  expect(parseFlags({ ...defaults, config: 'foo' })).toMatchInlineSnapshot(`
    Object {
      "config": <absolute path>/foo,
      "esFrom": undefined,
      "esVersion": <EsVersion 9.9.9>,
      "installDir": undefined,
      "logsDir": undefined,
    }
  `);
});

it('rejects zero configs', () => {
  expect(() => parseFlags({ ...defaults, config: [] })).toThrowErrorMatchingInlineSnapshot(
    `"At least one --config or --journey flag is required"`
  );
});

it('rejects two configs', () => {
  expect(() =>
    parseFlags({ ...defaults, config: ['foo'], journey: ['bar'] })
  ).toThrowErrorMatchingInlineSnapshot(`"expected exactly one --config or --journey flag"`);
});
