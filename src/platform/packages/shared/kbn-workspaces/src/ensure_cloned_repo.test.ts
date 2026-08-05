/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import os from 'os';
import Path from 'path';
import { ensureClonedRepo } from './ensure_cloned_repo';
import { exec } from './exec';
import { exists } from './utils/exists';
import { getGitCommonDir } from './utils/get_git_common_dir';
import type { WorkspaceGlobalContext } from './types';

jest.mock('./exec');
jest.mock('./utils/exists');
jest.mock('./utils/get_git_common_dir');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockExists = exists as jest.MockedFunction<typeof exists>;
const mockGetGitCommonDir = getGitCommonDir as jest.MockedFunction<typeof getGitCommonDir>;

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
    jest.clearAllMocks();
    mockExec.mockResolvedValue({} as Awaited<ReturnType<typeof exec>>);
  });

  it('clones with --reference and fetches the ref when base does not exist', async () => {
    mockExists.mockResolvedValue(false);
    mockGetGitCommonDir.mockResolvedValue('/path/to/main/.git');

    const context = createContext();

    await ensureClonedRepo(context, { ref: 'main' });

    expect(mockGetGitCommonDir).toHaveBeenCalledWith(context.repoRoot);
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['clone', '--reference', '/path/to/main/.git', context.repoRoot, context.baseCloneDir],
      expect.objectContaining({ cwd: process.cwd() })
    );
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['fetch', 'origin', 'main'],
      expect.objectContaining({ cwd: context.baseCloneDir })
    );
  });

  it('fetches only the ref when base already exists', async () => {
    mockExists.mockResolvedValue(true);

    const context = createContext();

    await ensureClonedRepo(context, { ref: 'feature/foo' });

    expect(mockGetGitCommonDir).not.toHaveBeenCalled();
    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['fetch', 'origin', 'feature/foo'],
      expect.objectContaining({ cwd: context.baseCloneDir })
    );
  });
});
