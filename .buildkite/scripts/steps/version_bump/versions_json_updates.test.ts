/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const LIB = resolve(__dirname, 'versions_json_updates.sh');

let workDir: string;

const writeBranches = (entries: ReadonlyArray<readonly [branch: string, version: string]>) => {
  const versions = entries.map(([branch, version]) =>
    branch === 'main' ? { branch, version } : { branch, version, branchType: 'release' }
  );
  writeFileSync(join(workDir, 'versions.json'), JSON.stringify({ versions }));
};

const readBranches = (): string[] =>
  JSON.parse(readFileSync(join(workDir, 'versions.json'), 'utf8')).versions.map(
    ({ branch }: { branch: string }) => branch
  );

const run = (commands: string, branch: string, newVersion: string) =>
  execFileSync('bash', ['-euo', 'pipefail', '-c', `source "${LIB}"; ${commands}`], {
    cwd: workDir,
    env: { ...process.env, BRANCH: branch, NEW_VERSION: newVersion },
    stdio: 'pipe',
  });

const minorBump = (branch: string, newVersion: string) =>
  run('update_minor_versions_json', branch, newVersion);

const patchBump = (branch: string, newVersion: string) =>
  run('update_patch_versions_json; prune_superseded_minors', branch, newVersion);

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'versions-json-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('versions.json n-2 minor lifecycle', () => {
  beforeEach(() => {
    writeBranches([
      ['main', '9.6.0'],
      ['9.5', '9.5.0'],
      ['9.4', '9.4.3'],
      ['8.19', '8.19.9'],
    ]);
  });

  it('keeps the n-2 minor on the minor bump and drops it on the X.Y.1 patch bump', () => {
    minorBump('9.6', '9.6.0');
    expect(readBranches()).toEqual(['main', '9.6', '9.5', '9.4', '8.19']);

    patchBump('9.4', '9.4.4');
    expect(readBranches()).toEqual(['main', '9.6', '9.5', '9.4', '8.19']);

    patchBump('9.6', '9.6.1');
    expect(readBranches()).toEqual(['main', '9.6', '9.5', '8.19']);

    patchBump('9.6', '9.6.2');
    expect(readBranches()).toEqual(['main', '9.6', '9.5', '8.19']);
  });

  it('keeps branches still in use when an older minor gets a late X.Y.1', () => {
    minorBump('9.6', '9.6.0');

    patchBump('9.5', '9.5.1');

    expect(readBranches()).toEqual(['main', '9.6', '9.5', '9.4', '8.19']);
  });
});

it('leaves other majors alone on the first patch of a new major', () => {
  writeBranches([
    ['main', '10.1.0'],
    ['10.0', '10.0.0'],
    ['9.6', '9.6.3'],
    ['8.19', '8.19.9'],
  ]);

  patchBump('10.0', '10.0.1');

  expect(readBranches()).toEqual(['main', '10.0', '9.6', '8.19']);
});
