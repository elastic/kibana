/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as gitStrategy from '../../affected-packages/strategy_git.ts';

let mockRepoRoot: string;
jest.mock('../../get_kibana_dir.ts', () => ({ getKibanaDir: () => mockRepoRoot }));
jest.mock('../../utils.ts', () => ({ getKibanaDir: () => mockRepoRoot }));

import { resolveSelectiveTestingChanges } from './selective_changes.ts';

const git = (...args: string[]): string =>
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], {
    cwd: mockRepoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const commitFile = (file: string): string => {
  writeFileSync(join(mockRepoRoot, file), file);
  git('add', file);
  git('commit', '-m', file);
  return git('rev-parse', 'HEAD');
};

describe('resolveSelectiveTestingChanges', () => {
  let originalBase: string;
  let groupBase: string;
  let groupHead: string;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockRepoRoot = mkdtempSync(join(tmpdir(), 'selective-changes-'));
    git('init', '-b', 'main');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.com');
    originalBase = commitFile('README.md');
    groupBase = commitFile('package.json');
    commitFile('first.ts');
    groupHead = commitFile('second.ts');
    git('checkout', '--detach', groupHead);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(mockRepoRoot, { recursive: true, force: true });
  });

  it('keeps the entire pinned group but excludes earlier queued changes as main advances', () => {
    git('update-ref', 'refs/heads/main', originalBase);
    expect(resolveSelectiveTestingChanges(groupBase, true)).toEqual(['first.ts', 'second.ts']);
    git('update-ref', 'refs/heads/main', groupHead);
    expect(resolveSelectiveTestingChanges(groupBase, true)).toEqual(['first.ts', 'second.ts']);
    expect(console.log).toHaveBeenCalledWith(
      `Selective testing comparison: base=${groupBase} head=${groupHead} changedFiles=2`
    );
  });

  it.each([
    [undefined, 'BUILDKITE_MERGE_QUEUE_BASE_COMMIT is not set'],
    ['main', 'BUILDKITE_MERGE_QUEUE_BASE_COMMIT must be a full commit SHA'],
  ])('fails for a missing or invalid pinned base (%s)', (base, message) => {
    expect(() => resolveSelectiveTestingChanges(base, true)).toThrow(message);
  });

  it.each([true, false])('propagates Git lookup failures (merge queue: %s)', (isMergeQueue) => {
    expect(() => resolveSelectiveTestingChanges('f'.repeat(40), isMergeQueue)).toThrow(
      'Command failed: git rev-parse'
    );
  });

  it.each([true, false])(
    'propagates changed-file detection failures (merge queue: %s)',
    (isMergeQueue) => {
      jest.spyOn(gitStrategy, 'listChangedFiles').mockImplementationOnce(() => {
        throw new Error('git diff failed');
      });
      expect(() => resolveSelectiveTestingChanges(groupBase, isMergeQueue)).toThrow(
        'git diff failed'
      );
    }
  );

  it('rejects a pinned base on a divergent branch instead of widening the range', () => {
    git('checkout', '--detach', originalBase);
    const divergentBase = commitFile('unrelated.ts');
    git('checkout', '--detach', groupHead);

    expect(() => resolveSelectiveTestingChanges(divergentBase, true)).toThrow(
      `${divergentBase} is not an ancestor of HEAD=${groupHead}`
    );
  });

  it('continues resolving a common ancestor for PR comparisons and logs the actual base', () => {
    git('checkout', '--detach', originalBase);
    const divergentBase = commitFile('unrelated.ts');
    git('checkout', '--detach', groupHead);

    expect(resolveSelectiveTestingChanges(divergentBase, false)).toEqual([
      'first.ts',
      'package.json',
      'second.ts',
    ]);
    expect(console.log).toHaveBeenCalledWith(
      `Selective testing comparison: base=${originalBase} head=${groupHead} changedFiles=3`
    );
  });
});
