/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  getAffectedMoonProjectsFromChangedFiles,
  getMoonChangedFiles,
  resolveMoonAffectedBase,
  ROOT_MOON_PROJECT_ID,
  summarizeAffectedMoonProjects,
} from '@kbn/moon';
import { countCommitsBetweenRefs, hasStagedChanges } from '@kbn/dev-utils';
import { cleanupRootRefsConfig, updateRootRefsConfig } from './root_refs_config';
import { isCiEnvironment } from './src/archive/utils';

const tsProjectsState: { projects: any[] } = {
  projects: [],
};

vi.mock('@kbn/dev-cli-runner', () => {
      const mocked = {
      run: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/dev-cli-errors', () => {
      const mocked = {
      createFailError: (message: string) => new Error(message),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/repo-info', () => {
      const mocked = {
      REPO_ROOT: '/repo',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/moon', () => {
      const mocked = {
      getAffectedMoonProjectsFromChangedFiles: vi.fn(),
      getMoonChangedFiles: vi.fn(),
      resolveMoonAffectedBase: vi.fn(),
      ROOT_MOON_PROJECT_ID: 'kibana',
      summarizeAffectedMoonProjects: vi.fn(),
      normalizeRepoRelativePath: (pathValue: string) => pathValue.replace(/\\/g, '/'),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/dev-utils', async () => {
  const actual = (await vi.importActual('@kbn/dev-utils'));
  return {
    ...actual,
    countCommitsBetweenRefs: vi.fn().mockResolvedValue(3),
    hasStagedChanges: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('@kbn/std', () => {
      const mocked = {
      asyncForEachWithLimit: async (
        items: any[],
        _limit: number,
        iterator: (item: any) => Promise<void>
      ) => {
        for (const item of items) {
          await iterator(item);
        }
      },
      asyncMapWithLimit: async (
        items: any[],
        _limit: number,
        iterator: (item: any) => Promise<any>
      ) => {
        return await Promise.all(items.map((item) => iterator(item)));
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/ts-projects', () => {
      const mocked = {
      get TS_PROJECTS() {
        return tsProjectsState.projects;
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./root_refs_config', () => {
      const mocked = {
      ROOT_REFS_CONFIG_PATH: '/repo/tsconfig.refs.json',
      updateRootRefsConfig: vi.fn(),
      cleanupRootRefsConfig: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./src/archive/archive_ts_build_artifacts', () => {
      const mocked = {
      archiveTSBuildArtifacts: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./src/archive/restore_ts_build_artifacts', () => {
      const mocked = {
      restoreTSBuildArtifacts: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./src/archive/utils', () => {
      const mocked = {
      isCiEnvironment: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('execa', () => {
  const mockExecaFn = vi.fn();
  return {
    __esModule: true,
    default: mockExecaFn,
    __mock: { mockExecaFn },
  };
});

vi.mock('fs/promises', () => {
      const mocked = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      rm: vi.fn(),
      unlink: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockRun = (await vi.importMock('@kbn/dev-cli-runner')).run as Mock;
const fsPromises = (await vi.importMock('fs/promises')) as {
  readFile: Mock;
  writeFile: Mock;
  rm: Mock;
  unlink: Mock;
};
const mockGetAffectedMoonProjectsFromChangedFiles =
  getAffectedMoonProjectsFromChangedFiles as unknown as Mock;
const mockGetMoonChangedFiles = getMoonChangedFiles as unknown as Mock;
const mockResolveMoonAffectedBase = resolveMoonAffectedBase as unknown as Mock;
const mockSummarizeAffectedMoonProjects = summarizeAffectedMoonProjects as unknown as Mock;
const mockCountCommitsBetweenRefs = countCommitsBetweenRefs as unknown as Mock;
const mockHasStagedChanges = hasStagedChanges as unknown as Mock;
const mockUpdateRootRefsConfig = updateRootRefsConfig as unknown as Mock;
const mockCleanupRootRefsConfig = cleanupRootRefsConfig as unknown as Mock;
const mockIsCiEnvironment = isCiEnvironment as unknown as Mock;
const mockArchiveTSBuildArtifacts = (await vi.importMock('./src/archive/archive_ts_build_artifacts'))
  .archiveTSBuildArtifacts as Mock;
const mockRestoreTSBuildArtifacts = (await vi.importMock('./src/archive/restore_ts_build_artifacts'))
  .restoreTSBuildArtifacts as Mock;
const mockExeca = ((await vi.importMock('execa')) as { __mock: { mockExecaFn: Mock } }).__mock
  .mockExecaFn;

let contractHandler: (args: {
  log: { info: Mock; warning: Mock; verbose: Mock };
  flagsReader: {
    boolean: (name: string) => boolean;
    string: (name: string) => string | undefined;
    path: (name: string) => string | undefined;
  };
  procRunner: { run: Mock };
}) => Promise<void>;

let legacyHandler: (args: {
  log: { info: Mock; warning: Mock; verbose: Mock };
  flagsReader: {
    boolean: (name: string) => boolean;
    string: (name: string) => string | undefined;
    path: (name: string) => string | undefined;
  };
  procRunner: { run: Mock };
}) => Promise<void>;

const createProject = (overrides: Record<string, unknown> = {}) => ({
  isTypeCheckDisabled: () => false,
  path: '/repo/packages/foo/tsconfig.json',
  repoRel: 'packages/foo',
  config: {
    compilerOptions: {},
  },
  getBase: () => undefined,
  getKbnRefs: () => [],
  directory: '/repo/packages/foo',
  typeCheckConfigPath: '/repo/packages/foo/tsconfig.type_check.json',
  ...overrides,
});

const createFlagsReader = (flags: Record<string, unknown>) => ({
  boolean(name: string) {
    return flags[name] === true;
  },
  string(name: string) {
    const value = flags[name];
    return typeof value === 'string' ? value : undefined;
  },
  path(name: string) {
    const value = flags[name];
    return typeof value === 'string' ? value : undefined;
  },
});

const createContext = (flags: Record<string, unknown>) => {
  const log = {
    info: vi.fn(),
    warning: vi.fn(),
    verbose: vi.fn(),
  };

  const procRunner = {
    run: vi.fn().mockResolvedValue(undefined),
  };

  return {
    log,
    procRunner,
    flagsReader: createFlagsReader(flags),
  };
};

const configureBranchBase = (baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007') => {
  mockResolveMoonAffectedBase.mockResolvedValue({
    base: baseSha,
    baseRef: 'upstream/main',
  });
};

describe('run_type_check_cli', () => {
  beforeAll(async () => {
    mockRun.mockClear();
    const { runLegacyTypeCheckCli, runTypeCheckContractCli } = await import('./run_type_check_cli');
    runLegacyTypeCheckCli();
    legacyHandler = mockRun.mock.calls[0][0];
    runTypeCheckContractCli();
    contractHandler = mockRun.mock.calls[1][0];
  });

  beforeEach(() => {
    vi.clearAllMocks();

    tsProjectsState.projects = [];

    const notFoundError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    fsPromises.readFile.mockRejectedValue(notFoundError);
    fsPromises.writeFile.mockResolvedValue(undefined);
    fsPromises.rm.mockResolvedValue(undefined);
    fsPromises.unlink.mockResolvedValue(undefined);
    mockExeca.mockResolvedValue({ stdout: '' });

    mockIsCiEnvironment.mockReturnValue(false);
    mockCountCommitsBetweenRefs.mockResolvedValue(3);
    mockGetMoonChangedFiles.mockResolvedValue([]);
    mockHasStagedChanges.mockResolvedValue(true);
    mockSummarizeAffectedMoonProjects.mockImplementation(
      (projects: Array<{ id: string; sourceRoot: string }>) => {
        const nonRootProjects = projects.filter((project) => project.id !== ROOT_MOON_PROJECT_ID);

        return {
          sourceRoots: nonRootProjects.map((project) => project.sourceRoot),
          isRootProjectAffected: projects.some((project) => project.id === ROOT_MOON_PROJECT_ID),
        };
      }
    );
  });

  it('legacy CLI runs the default type check path when no validation flags are provided', async () => {
    tsProjectsState.projects = [createProject()];

    const ctx = createContext({});
    await legacyHandler(ctx);

    expect(mockResolveMoonAffectedBase).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
    expect(mockUpdateRootRefsConfig).toHaveBeenCalledTimes(1);
    expect(ctx.procRunner.run).toHaveBeenCalledWith(
      'tsc',
      expect.objectContaining({
        args: expect.arrayContaining(['-b', 'packages/foo/tsconfig.type_check.json', '--pretty']),
        env: { GOMEMLIMIT: '12288MiB' },
      })
    );
  });

  it('legacy CLI cleans up generated configs before failing CI archive validation', async () => {
    tsProjectsState.projects = [createProject()];
    mockIsCiEnvironment.mockReturnValue(true);
    mockExeca.mockResolvedValue({
      stdout: ' M packages/foo/tsconfig.type_check.json',
    });

    const ctx = createContext({ cleanup: true, 'with-archive': true });

    await expect(legacyHandler(ctx)).rejects.toThrow(
      'Cancelling TypeScript cache archive because uncommitted changes were detected after the TypeScript build.'
    );

    expect(mockCleanupRootRefsConfig).toHaveBeenCalledTimes(1);
    expect(fsPromises.unlink).toHaveBeenCalledWith('/repo/packages/foo/tsconfig.type_check.json');
    expect(mockArchiveTSBuildArtifacts).not.toHaveBeenCalled();
  });

  it('uses branch profile affected selection when validation flags are provided', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchBase(baseSha);
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([]);

    const ctx = createContext({ profile: 'branch' });
    await contractHandler(ctx);

    expect(mockResolveMoonAffectedBase).toHaveBeenCalledWith({
      headRef: 'HEAD',
    });
    expect(mockGetAffectedMoonProjectsFromChangedFiles).toHaveBeenCalledWith({
      changedFilesJson: JSON.stringify({ files: ['packages/foo/src/index.ts'] }),
      downstream: 'none',
    });
    expect(ctx.procRunner.run).not.toHaveBeenCalled();
    expect(ctx.log.info).toHaveBeenCalledWith(
      `No affected TypeScript projects found between upstream/main (${baseSha.slice(
        0,
        12
      )}) and HEAD; skipping type check.`
    );
  });

  it('supports quick profile (local related mode) without branch base resolution', async () => {
    tsProjectsState.projects = [createProject()];
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([]);

    const ctx = createContext({ profile: 'quick' });
    await contractHandler(ctx);

    expect(mockResolveMoonAffectedBase).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjectsFromChangedFiles).toHaveBeenCalledWith({
      changedFilesJson: JSON.stringify({ files: ['packages/foo/src/index.ts'] }),
      downstream: 'none',
    });
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in local changes; skipping type check.'
    );
  });

  it('supports staged scope via Moon changed-files piping', async () => {
    tsProjectsState.projects = [createProject()];
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([]);

    const ctx = createContext({ scope: 'staged', downstream: 'deep' });
    await contractHandler(ctx);

    expect(mockResolveMoonAffectedBase).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjectsFromChangedFiles).toHaveBeenCalledWith({
      changedFilesJson: JSON.stringify({ files: ['packages/foo/src/index.ts'] }),
      downstream: 'deep',
    });
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in staged changes; skipping type check.'
    );
  });

  it('supports --clean-cache on the contract path', async () => {
    tsProjectsState.projects = [createProject()];

    const ctx = createContext({ profile: 'quick', 'clean-cache': true });
    await contractHandler(ctx);

    expect(fsPromises.rm).toHaveBeenCalledWith('/repo/packages/foo/target/types', {
      force: true,
      recursive: true,
    });
    expect(fsPromises.rm).toHaveBeenCalledWith(expect.stringContaining('/archives'), {
      force: true,
      recursive: true,
    });
    expect(mockGetMoonChangedFiles).not.toHaveBeenCalled();
    expect(ctx.procRunner.run).not.toHaveBeenCalled();
  });

  it('restores and archives caches when --with-archive is used on the contract path', async () => {
    tsProjectsState.projects = [createProject()];
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: 'foo', sourceRoot: 'packages/foo' },
    ]);

    const ctx = createContext({ profile: 'quick', 'with-archive': true });
    await contractHandler(ctx);

    expect(mockRestoreTSBuildArtifacts).toHaveBeenCalledTimes(1);
    expect(ctx.procRunner.run).toHaveBeenCalledTimes(1);
    expect(mockArchiveTSBuildArtifacts).toHaveBeenCalledTimes(1);
  });

  it('only uploads (not restores) when --upload-archive is used on the contract path', async () => {
    tsProjectsState.projects = [createProject()];
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: 'foo', sourceRoot: 'packages/foo' },
    ]);

    const ctx = createContext({ profile: 'quick', 'upload-archive': true });
    await contractHandler(ctx);

    expect(mockRestoreTSBuildArtifacts).not.toHaveBeenCalled();
    expect(ctx.procRunner.run).toHaveBeenCalledTimes(1);
    expect(mockArchiveTSBuildArtifacts).toHaveBeenCalledTimes(1);
  });

  it('only restores (not uploads) when --restore-archive is used on the contract path', async () => {
    tsProjectsState.projects = [createProject()];
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: 'foo', sourceRoot: 'packages/foo' },
    ]);

    const ctx = createContext({ profile: 'quick', 'restore-archive': true });
    await contractHandler(ctx);

    expect(mockRestoreTSBuildArtifacts).toHaveBeenCalledTimes(1);
    expect(ctx.procRunner.run).toHaveBeenCalledTimes(1);
    expect(mockArchiveTSBuildArtifacts).not.toHaveBeenCalled();
  });

  it('skips staged scope immediately when nothing is staged', async () => {
    tsProjectsState.projects = [createProject()];
    mockHasStagedChanges.mockResolvedValue(false);

    const ctx = createContext({ scope: 'staged' });
    await contractHandler(ctx);

    expect(mockResolveMoonAffectedBase).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
    expect(ctx.procRunner.run).not.toHaveBeenCalled();
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in staged changes; skipping type check.'
    );
  });

  it('skips Moon affected selection when there are no changed files', async () => {
    tsProjectsState.projects = [createProject()];

    const ctx = createContext({ profile: 'quick' });
    await contractHandler(ctx);

    expect(mockResolveMoonAffectedBase).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in local changes; skipping type check.'
    );
  });

  it('rejects --base-ref outside branch scope', async () => {
    const ctx = createContext({ scope: 'local', 'base-ref': 'origin/main' });

    await expect(contractHandler(ctx)).rejects.toThrow(
      '--base-ref can only be used when --scope is branch.'
    );
    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
  });

  it('falls back to full type-check when root TypeScript inputs are affected', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchBase(baseSha);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: ROOT_MOON_PROJECT_ID, sourceRoot: '.' },
    ]);
    mockGetMoonChangedFiles.mockResolvedValue(['tsconfig.base.json']);

    const ctx = createContext({ profile: 'branch' });
    await contractHandler(ctx);

    expect(ctx.log.info).toHaveBeenCalledWith(
      'Root TypeScript inputs changed; escalating to full type check of all projects.'
    );
    expect(mockUpdateRootRefsConfig).toHaveBeenCalledTimes(1);
    expect(ctx.procRunner.run).toHaveBeenCalledWith(
      'tsc',
      expect.objectContaining({
        args: expect.arrayContaining(['-b', 'tsconfig.refs.json', '--pretty']),
        env: { GOMEMLIMIT: '12288MiB' },
      })
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      expect.stringContaining('Running `node scripts/type_check --profile full`')
    );
  });

  it('ignores non-TypeScript root changes when selecting affected projects', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchBase(baseSha);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([]);
    mockGetMoonChangedFiles.mockResolvedValue(['.github/CODEOWNERS']);

    const ctx = createContext({ profile: 'branch' });
    await contractHandler(ctx);

    expect(mockUpdateRootRefsConfig).not.toHaveBeenCalled();
    expect(ctx.procRunner.run).not.toHaveBeenCalled();
    expect(ctx.log.info).toHaveBeenCalledWith(
      `No affected TypeScript projects found between upstream/main (${baseSha.slice(
        0,
        12
      )}) and HEAD; skipping type check.`
    );
  });

  it('omits commit count in branch summary when commit counting fails', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchBase(baseSha);
    mockCountCommitsBetweenRefs.mockRejectedValue(new Error('count failed'));
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: ROOT_MOON_PROJECT_ID, sourceRoot: '.' },
    ]);
    mockGetMoonChangedFiles.mockResolvedValue(['tsconfig.base.json']);

    const ctx = createContext({ profile: 'branch' });
    await contractHandler(ctx);

    const scopeMessage = ctx.log.info.mock.calls
      .map((call) => call[0])
      .find((message) => message.startsWith('Checking '));

    expect(scopeMessage).toEqual(expect.any(String));
    expect(scopeMessage as string).toContain(
      `between upstream/main (${baseSha.slice(0, 12)}) and HEAD`
    );
    expect(scopeMessage as string).toContain('affected by commits');
  });

  it('prints CI reproduction command with resolved base SHA for copy/paste', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    mockResolveMoonAffectedBase.mockResolvedValue({
      base: baseSha,
      baseRef: 'GITHUB_PR_MERGE_BASE',
    });
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: 'foo', sourceRoot: 'packages/foo' },
    ]);
    mockIsCiEnvironment.mockReturnValue(true);

    const ctx = createContext({ profile: 'branch' });
    ctx.procRunner.run.mockRejectedValue(new Error('tsc failed'));

    await expect(contractHandler(ctx)).rejects.toThrow(
      `tsc failed. Reproduce this run locally with:\n  node scripts/type_check --scope branch --test-mode affected --base-ref ${baseSha}`
    );
  });
});
