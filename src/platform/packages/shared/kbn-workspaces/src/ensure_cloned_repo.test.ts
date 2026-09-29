/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { ToolingLog } from '@kbn/tooling-log';
import os from 'os';
import Path from 'path';
import { ensureClonedRepo } from './ensure_cloned_repo';
import { exec } from './exec';
import { exists } from './utils/exists';
import { getGitCommonDir } from './utils/get_git_common_dir';
import { commitExists } from './utils/commit_exists';
import type { WorkspaceGlobalContext } from './types';

vi.mock('./exec');
vi.mock('./utils/exists');
vi.mock('./utils/get_git_common_dir');
vi.mock('./utils/commit_exists');

const mockExec = exec as MockedFunction<typeof exec>;
const mockExists = exists as MockedFunction<typeof exists>;
const mockGetGitCommonDir = getGitCommonDir as MockedFunction<typeof getGitCommonDir>;
const mockCommitExists = commitExists as MockedFunction<typeof commitExists>;

function createContext(): WorkspaceGlobalContext {
  const log = new ToolingLog({
    level: 'silent',
    writeTo: {
      write: () => {},
    },
  });

  const workspacesRoot = Path.join(os.tmpdir(), 'kbn-ws-ensure-cloned-test', String(Math.random()));

  return {
    log,
    repoRoot: Path.join(workspacesRoot, 'repo'),
    workspacesRoot,
    baseCloneDir: Path.join(workspacesRoot, 'base'),
    stateFilepath: Path.join(workspacesRoot, 'state.json'),
    settings: {
      maxWorkspaces: 10,
    },
  };
}

describe('ensureClonedRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockResolvedValue({} as Awaited<ReturnType<typeof exec>>);
    mockCommitExists.mockResolvedValue(false);
  });

  it('clones with --reference and fetches the ref when base does not exist', async () => {
    mockExists.mockResolvedValue(false);
    mockGetGitCommonDir.mockResolvedValue('/path/to/main/.git');

    const context = createContext();
    const sha = 'abc123def456';

    await ensureClonedRepo(context, { ref: sha });

    expect(mockGetGitCommonDir).toHaveBeenCalledWith(context.repoRoot);
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['clone', '--reference', '/path/to/main/.git', context.repoRoot, context.baseCloneDir],
      expect.objectContaining({ cwd: process.cwd() })
    );
    expect(mockCommitExists).toHaveBeenCalledWith(context.baseCloneDir, sha);
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['fetch', context.repoRoot, sha],
      expect.objectContaining({ cwd: context.baseCloneDir })
    );
  });

  it('fetches from the source repo when the commit is missing from base', async () => {
    mockExists.mockResolvedValue(true);
    mockCommitExists.mockResolvedValue(false);

    const context = createContext();
    const sha = 'deadbeef';

    await ensureClonedRepo(context, { ref: sha });

    expect(mockGetGitCommonDir).not.toHaveBeenCalled();
    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['fetch', context.repoRoot, sha],
      expect.objectContaining({ cwd: context.baseCloneDir })
    );
  });

  it('skips fetch when the commit is already reachable in base', async () => {
    mockExists.mockResolvedValue(true);
    mockCommitExists.mockResolvedValue(true);

    const context = createContext();
    const sha = 'deadbeef';

    await ensureClonedRepo(context, { ref: sha });

    expect(mockExec).not.toHaveBeenCalled();
  });
});
