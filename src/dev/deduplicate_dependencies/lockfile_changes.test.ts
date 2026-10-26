/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { classifyLockfileChange, reconcileLockfile } from './lockfile_changes';

const original = `---
lockfileVersion: '9.0'
packages:
  pnpm@12.4.2:
    resolution:
      integrity: sha512-pnpm
snapshots:
  pnpm@12.4.2: {}
---
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      example:
        specifier: ^1.0.0
        version: 1.0.0
packages:
  example@1.0.0:
    resolution:
      integrity: sha512-original
snapshots:
  example@1.0.0: {}
`;

describe('deduplicated lockfile changes', () => {
  let directory: string;
  let lockfilePath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'kibana-dedupe-'));
    lockfilePath = join(directory, 'pnpm-lock.yaml');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('restores a deprecation-only update so the gate sees an unchanged file', () => {
    const withDeprecation = original.replace(
      '  example@1.0.0:\n    resolution:',
      '  example@1.0.0:\n    deprecated: Use another package\n    resolution:'
    );
    writeFileSync(lockfilePath, withDeprecation);

    expect(reconcileLockfile(lockfilePath, original)).toEqual({
      kind: 'informational',
      deprecatedPackages: ['example@1.0.0'],
    });
    expect(readFileSync(lockfilePath, 'utf8')).toBe(original);
  });

  it('leaves resolution changes for the gate to reject', () => {
    const changedIntegrity = original.replace('sha512-original', 'sha512-changed');
    writeFileSync(lockfilePath, changedIntegrity);

    expect(reconcileLockfile(lockfilePath, original).kind).toBe('material');
    expect(readFileSync(lockfilePath, 'utf8')).toBe(changedIntegrity);
  });

  it('treats a graph change as material even when deprecation metadata also changes', () => {
    const changedGraph = original
      .replace('version: 1.0.0', 'version: 2.0.0')
      .replace(
        '  example@1.0.0:\n    resolution:',
        '  example@1.0.0:\n    deprecated: Old\n    resolution:'
      );

    expect(classifyLockfileChange(original, changedGraph).kind).toBe('material');
  });

  it('treats a lockfile formatting rewrite as informational', () => {
    expect(classifyLockfileChange(original, original.replace("'9.0'", '"9.0"'))).toEqual({
      kind: 'informational',
      deprecatedPackages: [],
    });
  });
});
