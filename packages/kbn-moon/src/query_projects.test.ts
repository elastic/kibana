/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

const mockExeca = vi.fn();

vi.mock('fs', () => {
  const mocked = {
    ...require('fs'),
    existsSync: vi.fn().mockReturnValue(true),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/repo-info', () => {
  const mocked = {
    REPO_ROOT: '/repo',
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/dev-utils', () => {
  const mocked = {
    getRemoteDefaultBranchRefs: vi.fn(),
    resolveNearestMergeBase: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('execa', () => ({
  __esModule: true,
  default: mockExeca,
}));

const createMoonProjectsOutput = (projects: Array<{ id: string; sourceRoot: string }>) =>
  JSON.stringify({
    projects: projects.map((project) => ({
      id: project.id,
      source: project.sourceRoot,
      config: {
        project: {
          metadata: {
            sourceRoot: project.sourceRoot,
          },
        },
      },
    })),
  });

describe('getAffectedMoonProjectsFromChangedFiles', () => {
  beforeEach(() => {
    vi.resetModules();
    mockExeca.mockReset();
  });

  it('adds the root project for repo-root TypeScript inputs', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: createMoonProjectsOutput([]),
    });

    const { getAffectedMoonProjectsFromChangedFiles } = await import('./query_projects');

    await expect(
      getAffectedMoonProjectsFromChangedFiles({
        changedFilesJson: JSON.stringify({ files: ['tsconfig.base.json'] }),
      })
    ).resolves.toEqual([{ id: 'kibana', sourceRoot: '.' }]);
  });

  it('adds the root project alongside affected package projects for typings changes', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: createMoonProjectsOutput([{ id: 'foo', sourceRoot: 'packages/foo' }]),
    });

    const { getAffectedMoonProjectsFromChangedFiles } = await import('./query_projects');

    await expect(
      getAffectedMoonProjectsFromChangedFiles({
        changedFilesJson: JSON.stringify({
          files: ['packages/foo/src/index.ts', 'typings/something.d.ts'],
        }),
      })
    ).resolves.toEqual([
      { id: 'foo', sourceRoot: 'packages/foo' },
      { id: 'kibana', sourceRoot: '.' },
    ]);
  });

  it('does not add the root project for package-owned files', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: createMoonProjectsOutput([{ id: 'foo', sourceRoot: 'packages/foo' }]),
    });

    const { getAffectedMoonProjectsFromChangedFiles } = await import('./query_projects');

    await expect(
      getAffectedMoonProjectsFromChangedFiles({
        changedFilesJson: JSON.stringify({ files: ['packages/foo/src/index.ts'] }),
      })
    ).resolves.toEqual([{ id: 'foo', sourceRoot: 'packages/foo' }]);
  });

  it('does not add the root project for unrelated repo-root files', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: createMoonProjectsOutput([]),
    });

    const { getAffectedMoonProjectsFromChangedFiles } = await import('./query_projects');

    await expect(
      getAffectedMoonProjectsFromChangedFiles({
        changedFilesJson: JSON.stringify({ files: ['.github/CODEOWNERS'] }),
      })
    ).resolves.toEqual([]);
  });

  it('keeps Moon-reported root project results without querying all projects again', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: createMoonProjectsOutput([{ id: 'kibana', sourceRoot: '.' }]),
    });

    const { getAffectedMoonProjectsFromChangedFiles } = await import('./query_projects');

    await expect(
      getAffectedMoonProjectsFromChangedFiles({
        changedFilesJson: JSON.stringify({ files: ['tsconfig.base.json'] }),
      })
    ).resolves.toEqual([{ id: 'kibana', sourceRoot: '.' }]);

    expect(mockExeca).toHaveBeenCalledTimes(1);
  });
});
