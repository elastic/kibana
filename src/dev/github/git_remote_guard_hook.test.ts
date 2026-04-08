/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpawnSyncReturns } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runGitRemoteGuardHook } from './git_remote_guard_hook';

jest.mock('node:child_process');
jest.mock('node:fs');

const spawnSyncMock = spawnSync as jest.MockedFunction<typeof spawnSync>;
const readFileSyncMock = readFileSync as jest.MockedFunction<typeof readFileSync>;

const REMOTES = [
  'origin\tgit@github.com:elastic/kibana.git (fetch)',
  'origin\tgit@github.com:elastic/kibana.git (push)',
  'bamieh\tgit@github.com:Bamieh/kibana.git (fetch)',
  'bamieh\tgit@github.com:Bamieh/kibana.git (push)',
].join('\n');

const spawnResult = (overrides: Partial<SpawnSyncReturns<string>>): SpawnSyncReturns<string> => ({
  stdout: '',
  stderr: '',
  status: 0,
  pid: 0,
  output: [],
  signal: null,
  ...overrides,
});

const ok = (stdout: string) => spawnResult({ stdout });
const fail = () => spawnResult({ status: 1, error: new Error() });

const setupGit = (overrides: Record<string, string> = {}) => {
  const responses: Record<string, string> = {
    'rev-parse --show-toplevel': '/repo',
    'remote -v': REMOTES,
    'branch --show-current': 'my-feature',
    'remote get-url origin': 'git@github.com:elastic/kibana.git',
    'remote get-url bamieh': 'git@github.com:Bamieh/kibana.git',
    ...overrides,
  };
  spawnSyncMock.mockImplementation((_cmd, args) => {
    const key = (args as string[]).join(' ');
    const match = Object.entries(responses).find(([k]) => key.includes(k));
    return match ? ok(match[1]) : fail();
  });
};

const runHook = (payload: object, { claude = false }: { claude?: boolean } = {}) => {
  let output = '';

  readFileSyncMock.mockReturnValue(JSON.stringify(payload));

  const originalArgv = process.argv;
  process.argv = claude ? ['node', 'hook', '--claude'] : ['node', 'hook'];

  const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    output += chunk;
    return true;
  });
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`EXIT:${code ?? 0}`);
  });

  try {
    runGitRemoteGuardHook();
  } catch (e: any) {
    if (!e.message.startsWith('EXIT:')) throw e;
  } finally {
    writeSpy.mockRestore();
    exitSpy.mockRestore();
    process.argv = originalArgv;
  }

  return output.trim() ? JSON.parse(output.trim()) : null;
};

describe('git remote guard hook', () => {
  it('allows safe commands', () => {
    setupGit();

    expect(runHook({ command: 'npm install', cwd: '/repo' })).toEqual({ permission: 'allow' });
    expect(runHook({ command: 'git status', cwd: '/repo' })).toEqual({ permission: 'allow' });
    expect(runHook({ command: 'git pull origin main', cwd: '/repo' })).toEqual({
      permission: 'allow',
    });
    expect(runHook({ command: 'git push bamieh my-branch', cwd: '/repo' })).toEqual({
      permission: 'allow',
    });
    expect(runHook({ command: 'git pull bamieh feature', cwd: '/repo' })).toEqual({
      permission: 'allow',
    });
    expect(runHook({ command: 'gh pr create --title test', cwd: '/repo' })).toEqual({
      permission: 'allow',
    });
  });

  it('blocks pulling main from fork remote', () => {
    setupGit();

    const cases = [
      'git pull bamieh main',
      'git pull bamieh refs/heads/main',
      'git pull --rebase bamieh main',
      'git pull --ff-only bamieh main',
      'git fetch bamieh main',
      'git fetch bamieh refs/heads/main',
      'git merge bamieh/main',
      'git rebase bamieh/main',
      'git checkout main && git pull bamieh main',
    ];

    for (const cmd of cases) {
      const json = runHook({ command: cmd, cwd: '/repo' });
      expect(json).toMatchObject({ continue: false, permission: 'deny' });
      expect(json.agentMessage).toContain('Bamieh/kibana');
    }
  });

  it('blocks git pull <fork> when on main branch', () => {
    setupGit({ 'branch --show-current': 'main' });

    const json = runHook({ command: 'git pull bamieh', cwd: '/repo' });
    expect(json).toMatchObject({ continue: false, permission: 'deny' });
  });

  it('blocks pushing to canonical when fork exists', () => {
    setupGit();

    const cases = ['git push origin my-branch', 'git push -u origin my-branch'];

    for (const cmd of cases) {
      const json = runHook({ command: cmd, cwd: '/repo' });
      expect(json).toMatchObject({ continue: false, permission: 'deny' });
      expect(json.agentMessage).toContain('Push to your fork');
    }
  });

  it('responds with Claude format when --claude is set', () => {
    setupGit();

    const deny = runHook(
      { tool_input: { command: 'git pull bamieh main' }, cwd: '/repo' },
      { claude: true }
    );
    expect(deny.hookSpecificOutput.permissionDecision).toBe('deny');

    const allow = runHook(
      { tool_input: { command: 'git status' }, cwd: '/repo' },
      { claude: true }
    );
    expect(allow).toBeNull();
  });

  it('ignores unrelated remotes when checking for fork', () => {
    const remotesWithUnrelated = [
      'origin\tgit@github.com:elastic/kibana.git (fetch)',
      'origin\tgit@github.com:elastic/kibana.git (push)',
      'other\tgit@github.com:someuser/other-repo.git (fetch)',
      'other\tgit@github.com:someuser/other-repo.git (push)',
    ].join('\n');

    setupGit({
      'remote -v': remotesWithUnrelated,
      'remote get-url other': 'git@github.com:someuser/other-repo.git',
    });

    expect(runHook({ command: 'git push origin my-branch', cwd: '/repo' })).toEqual({
      permission: 'allow',
    });
  });

  it('allows everything when KIBANA_GIT_REMOTE_GUARD_BYPASS=1', () => {
    setupGit();
    const orig = process.env.KIBANA_GIT_REMOTE_GUARD_BYPASS;
    process.env.KIBANA_GIT_REMOTE_GUARD_BYPASS = '1';
    try {
      expect(runHook({ command: 'git pull bamieh main', cwd: '/repo' })).toEqual({
        permission: 'allow',
      });
    } finally {
      process.env.KIBANA_GIT_REMOTE_GUARD_BYPASS = orig;
    }
  });
});
