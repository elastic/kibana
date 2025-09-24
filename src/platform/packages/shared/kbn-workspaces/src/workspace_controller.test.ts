/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import Path from 'path';
import os from 'os';
import { ToolingLog } from '@kbn/tooling-log';
import { createWorkspaceGlobalContext } from './create_workspace_global_context';
import { WorkspaceController } from './workspace_controller';
import { ensureClonedRepo } from './ensure_cloned_repo';
import { SourceRepoWorkspace } from './source_repo_workspace';
import { WorktreeWorkspace } from './worktree_workspace';

// Helper to init a temporary git repo with an initial commit
async function initGitRepo(dir: string) {
  await Fs.mkdir(dir, { recursive: true });
  const execa = (await import('execa')).default;
  await execa('git', ['init'], { cwd: dir });
  await execa('git', ['config', 'user.email', 'you@example.com'], { cwd: dir });
  await execa('git', ['config', 'user.name', 'Your Name'], { cwd: dir });
  await Fs.writeFile(Path.join(dir, 'README.md'), '# temp repo\n');
  await execa('git', ['add', '.'], { cwd: dir });
  await execa('git', ['commit', '-m', 'init'], { cwd: dir });
}

function createLog(): ToolingLog {
  const log = new ToolingLog({
    level: 'silent',
    writeTo: {
      write: () => {
        // don't log anything
      },
    },
  });
  return log;
}

async function createContext(): Promise<ReturnType<typeof createWorkspaceGlobalContext>> {
  const tmp = await Fs.mkdtemp(Path.join(os.tmpdir(), 'kbn-ws-test-'));
  const repoRoot = Path.join(tmp, 'repo');
  await initGitRepo(repoRoot);
  return createWorkspaceGlobalContext({
    log: createLog(),
    settings: {
      repoRoot,
      workspacesRoot: Path.join(tmp, 'workspaces'),
      maxWorkspaces: 3,
    },
  });
}

describe('@kbn/workspaces controller', () => {
  test('cache key changes when diff changes', async () => {
    const context = await createContext();
    await ensureClonedRepo(context);
    const controller = new WorkspaceController(context);
    const source = await controller.fromSourceRepo();
    expect(source).toBeInstanceOf(SourceRepoWorkspace);

    const k1 = await (source as any).getCacheKey();

    // modify a file
    await Fs.writeFile(Path.join(source.getDir(), 'README.md'), '# temp repo modified\n');
    const execa = (await import('execa')).default;
    await execa('git', ['add', 'README.md'], { cwd: source.getDir() });
    const k2 = await (source as any).getCacheKey();

    expect(k1).not.toEqual(k2);
  });

  test('activating worktree creates directory and state', async () => {
    const context = await createContext();
    await ensureClonedRepo(context);
    const controller = new WorkspaceController(context);
    const wt = await controller.activateWorktree('HEAD');
    expect(wt).toBeInstanceOf(WorktreeWorkspace);
    const worktreeDir = wt.getDir();
    const exists = await Fs.access(Path.join(worktreeDir, '.git'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test('checkout task cache invalidates when worktree sha changes', async () => {
    const context = await createContext();
    await ensureClonedRepo(context);
    const controller = new WorkspaceController(context);
    const wt = await controller.activateWorktree('HEAD');
    await wt.ensureCheckout();
    const firstKey = (wt as any).getCacheKey ? await (wt as any).getCacheKey() : 'none';

    // create new commit in base clone so ref advances
    const execa = (await import('execa')).default;
    await Fs.writeFile(Path.join(context.baseCloneDir, 'NEW.txt'), 'hello');
    await execa('git', ['add', '.'], { cwd: context.baseCloneDir });
    // use inline git config to avoid relying on global/local git identity in CI
    await execa(
      'git',
      ['-c', 'user.email=you@example.com', '-c', 'user.name=Your Name', 'commit', '-m', 'new'],
      { cwd: context.baseCloneDir }
    );
    // fetch the new commit into the worktree so rev-parse in base clone reflects new sha
    await execa('git', ['fetch', '--all', '--prune', '--quiet'], { cwd: context.baseCloneDir });

    await wt.ensureCheckout();

    const secondKey = (wt as any).getCacheKey ? await (wt as any).getCacheKey() : 'none';
    expect(firstKey).not.toEqual(secondKey);
  });

  test('prunes oldest workspaces beyond maxWorkspaces', async () => {
    const context = await createContext();
    await ensureClonedRepo(context);
    const controller = new WorkspaceController(context);

    const a = await controller.activateWorktree('HEAD');
    // small delay so lastUsed ordering differs
    await new Promise((r) => setTimeout(r, 5));
    await new Promise((r) => setTimeout(r, 5));
    await controller.activateWorktree('HEAD');
    await new Promise((r) => setTimeout(r, 5));
    await controller.activateWorktree('HEAD');
    await new Promise((r) => setTimeout(r, 5));
    await controller.activateWorktree('HEAD'); // should trigger prune (max 3)

    const stateRaw = await Fs.readFile(context.stateFilepath, 'utf8');
    const state = JSON.parse(stateRaw) as any;
    const ids = Object.keys(state.workspaces);
    expect(ids.length).toBeLessThanOrEqual(3);
    // Oldest (a) should be gone if prune worked
    const aStillPresent = ids.some(
      (id) => id === (a as any).worktreeState?.worktree?.path || id === (a as any).state?.id
    );
    if (ids.length === 3) {
      expect(aStillPresent).toBe(false);
    }
  });
});
