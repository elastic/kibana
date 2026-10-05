/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRestorableArchiveEntry } from './utils';

describe('isRestorableArchiveEntry', () => {
  it.each([
    'src/platform/packages/shared/kbn-std/target/types/index.d.ts',
    'src/platform/packages/shared/kbn-std/target/types/src/lib/merge.d.ts',
    'src/platform/packages/shared/kbn-std/target/types/tsconfig.type_check.tsbuildinfo',
    'x-pack/platform/plugins/shared/fleet/target/types/common/index.d.ts.map',
    './src/core/packages/http/server/target/types/index.d.mts',
    'tsconfig.type_check.json',
    'examples/data_streams_example/tsconfig.type_check.json',
  ])('restores %s', (entryPath) => {
    expect(isRestorableArchiveEntry(entryPath, 'File')).toBe(true);
  });

  it.each([
    '.buildkite/scripts/lifecycle/pre_command.sh',
    '.git/hooks/pre-commit',
    'node_modules/typescript/lib/tsc.js',
    'node_modules/@kbn/std/target/types/index.d.ts',
    'packages/foo/node_modules/bar/target/types/index.d.ts',
    'src/foo/target/types/index.js',
    'src/foo/target/types/../../../.buildkite/hooks/pre-command.d.ts',
    '/etc/target/types/index.d.ts',
    'src//target/types/index.d.ts',
    'package.json',
    'tsconfig.json',
  ])('skips %s', (entryPath) => {
    expect(isRestorableArchiveEntry(entryPath, 'File')).toBe(false);
  });

  it.each(['SymbolicLink', 'Link', 'Directory'])('skips %s entries', (entryType) => {
    expect(isRestorableArchiveEntry('src/foo/target/types/index.d.ts', entryType)).toBe(false);
  });
});
