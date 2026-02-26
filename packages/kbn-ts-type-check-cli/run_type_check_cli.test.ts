/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAffectedMoonProjects,
  resolveMoonAffectedComparison,
  ROOT_MOON_PROJECT_ID,
  summarizeAffectedMoonProjects,
} from '@kbn/moon';
import { countCommitsBetweenRefs, hasStagedChanges } from '@kbn/dev-utils';
import { updateRootRefsConfig } from './root_refs_config';
import { isCiEnvironment } from './src/archive/utils';

const tsProjectsState: { projects: any[] } = {
  projects: [],
};

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: (message: string) => new Error(message),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

jest.mock('@kbn/moon', () => ({
  getAffectedMoonProjects: jest.fn(),
  resolveMoonAffectedComparison: jest.fn(),
  ROOT_MOON_PROJECT_ID: 'kibana',
  summarizeAffectedMoonProjects: jest.fn(),
  normalizeRepoRelativePath: (pathValue: string) => pathValue.replace(/\\/g, '/'),
}));

jest.mock('@kbn/dev-utils', () => {
  const actual = jest.requireActual('@kbn/dev-utils');
  return {
    ...actual,
    countCommitsBetweenRefs: jest.fn().mockResolvedValue(3),
    hasStagedChanges: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('@kbn/std', () => ({
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
}));

jest.mock('@kbn/ts-projects', () => ({
  get TS_PROJECTS() {
    return tsProjectsState.projects;
  },
}));

jest.mock('./root_refs_config', () => ({
  ROOT_REFS_CONFIG_PATH: '/repo/tsconfig.refs.json',
  updateRootRefsConfig: jest.fn(),
  cleanupRootRefsConfig: jest.fn(),
}));

jest.mock('./src/archive/archive_ts_build_artifacts', () => ({
  archiveTSBuildArtifacts: jest.fn(),
}));

jest.mock('./src/archive/restore_ts_build_artifacts', () => ({
  restoreTSBuildArtifacts: jest.fn(),
}));

jest.mock('./src/archive/utils', () => ({
  isCiEnvironment: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  rm: jest.fn(),
  unlink: jest.fn(),
}));

const mockRun = jest.requireMock('@kbn/dev-cli-runner').run as jest.Mock;
const fsPromises = jest.requireMock('fs/promises') as {
  readFile: jest.Mock;
  writeFile: jest.Mock;
  rm: jest.Mock;
  unlink: jest.Mock;
};
const mockGetAffectedMoonProjects = getAffectedMoonProjects as unknown as jest.Mock;
const mockResolveMoonAffectedComparison = resolveMoonAffectedComparison as unknown as jest.Mock;
const mockSummarizeAffectedMoonProjects = summarizeAffectedMoonProjects as unknown as jest.Mock;
const mockCountCommitsBetweenRefs = countCommitsBetweenRefs as unknown as jest.Mock;
const mockHasStagedChanges = hasStagedChanges as unknown as jest.Mock;
const mockUpdateRootRefsConfig = updateRootRefsConfig as unknown as jest.Mock;
const mockIsCiEnvironment = isCiEnvironment as unknown as jest.Mock;

let handler: (args: {
  log: { info: jest.Mock; warning: jest.Mock; verbose: jest.Mock };
  flagsReader: {
    boolean: (name: string) => boolean;
    string: (name: string) => string | undefined;
    path: (name: string) => string | undefined;
  };
  procRunner: { run: jest.Mock };
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
    info: jest.fn(),
    warning: jest.fn(),
    verbose: jest.fn(),
  };

  const procRunner = {
    run: jest.fn().mockResolvedValue(undefined),
  };

  return {
    log,
    procRunner,
    flagsReader: createFlagsReader(flags),
  };
};

const configureBranchComparison = (baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007') => {
  mockResolveMoonAffectedComparison.mockResolvedValue({
    base: baseSha,
    baseRef: 'upstream/main',
    head: 'HEAD',
    headRef: 'HEAD',
  });
};

describe('run_type_check_cli', () => {
  beforeAll(() => {
    require('./run_type_check_cli');
    handler = mockRun.mock.calls[0][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();

    tsProjectsState.projects = [];

    const notFoundError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    fsPromises.readFile.mockRejectedValue(notFoundError);
    fsPromises.writeFile.mockResolvedValue(undefined);
    fsPromises.rm.mockResolvedValue(undefined);
    fsPromises.unlink.mockResolvedValue(undefined);

    mockIsCiEnvironment.mockReturnValue(false);
    mockCountCommitsBetweenRefs.mockResolvedValue(3);
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

  it('defaults to branch profile and passes base/head to Moon affected selection', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchComparison(baseSha);
    mockGetAffectedMoonProjects.mockResolvedValue([]);

    const ctx = createContext({});
    await handler(ctx);

    expect(mockResolveMoonAffectedComparison).toHaveBeenCalledWith({
      scope: 'branch',
      baseRef: undefined,
      headRef: undefined,
    });
    expect(mockGetAffectedMoonProjects).toHaveBeenCalledWith({
      downstream: 'none',
      base: baseSha,
      head: 'HEAD',
    });
    expect(ctx.procRunner.run).not.toHaveBeenCalled();
    expect(ctx.log.info).toHaveBeenCalledWith(
      `No affected TypeScript projects found between upstream/main (${baseSha.slice(
        0,
        12
      )}) and HEAD; skipping type check.`
    );
  });

  it('supports quick profile (local related mode) without branch comparison', async () => {
    tsProjectsState.projects = [createProject()];
    mockGetAffectedMoonProjects.mockResolvedValue([]);

    const ctx = createContext({ profile: 'quick' });
    await handler(ctx);

    expect(mockResolveMoonAffectedComparison).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjects).toHaveBeenCalledWith({
      downstream: 'none',
    });
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in local changes; skipping type check.'
    );
  });

  it('supports staged scope by asking Moon for a staged comparison', async () => {
    tsProjectsState.projects = [createProject()];
    mockResolveMoonAffectedComparison.mockResolvedValue({
      base: 'HEAD',
      baseRef: 'HEAD',
      head: 'index-snapshot-sha',
      headRef: 'INDEX',
    });
    mockGetAffectedMoonProjects.mockResolvedValue([]);

    const ctx = createContext({ scope: 'staged', downstream: 'deep' });
    await handler(ctx);

    expect(mockResolveMoonAffectedComparison).toHaveBeenCalledWith({ scope: 'staged' });
    expect(mockGetAffectedMoonProjects).toHaveBeenCalledWith({
      downstream: 'deep',
      base: 'HEAD',
      head: 'index-snapshot-sha',
    });
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in staged changes; skipping type check.'
    );
  });

  it('skips staged scope immediately when nothing is staged', async () => {
    tsProjectsState.projects = [createProject()];
    mockHasStagedChanges.mockResolvedValue(false);

    const ctx = createContext({ scope: 'staged' });
    await handler(ctx);

    expect(mockResolveMoonAffectedComparison).not.toHaveBeenCalled();
    expect(mockGetAffectedMoonProjects).not.toHaveBeenCalled();
    expect(ctx.procRunner.run).not.toHaveBeenCalled();
    expect(ctx.log.info).toHaveBeenCalledWith(
      'No affected TypeScript projects found in staged changes; skipping type check.'
    );
  });

  it('rejects --base-ref outside branch scope', async () => {
    const ctx = createContext({ scope: 'local', 'base-ref': 'origin/main' });

    await expect(handler(ctx)).rejects.toThrow(
      '--base-ref can only be used when --scope is branch.'
    );
    expect(mockGetAffectedMoonProjects).not.toHaveBeenCalled();
  });

  it('falls back to full type-check when only the root Moon project is affected', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchComparison(baseSha);
    mockGetAffectedMoonProjects.mockResolvedValue([{ id: ROOT_MOON_PROJECT_ID, sourceRoot: '.' }]);

    const ctx = createContext({});
    await handler(ctx);

    expect(ctx.log.info).toHaveBeenCalledWith(
      'Root project is affected; escalating to full type check of all projects.'
    );
    expect(mockUpdateRootRefsConfig).toHaveBeenCalledTimes(1);
    expect(ctx.procRunner.run).toHaveBeenCalledWith(
      'tsc',
      expect.objectContaining({
        args: expect.arrayContaining(['-b', 'tsconfig.refs.json', '--pretty']),
      })
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      expect.stringContaining('cmd: node scripts/type_check --profile full')
    );
  });

  it('omits commit count in branch summary when commit counting fails', async () => {
    const baseSha = '2365cc0e7c29d5cc2324cd078a9854866e01e007';
    tsProjectsState.projects = [createProject()];
    configureBranchComparison(baseSha);
    mockCountCommitsBetweenRefs.mockRejectedValue(new Error('count failed'));
    mockGetAffectedMoonProjects.mockResolvedValue([{ id: ROOT_MOON_PROJECT_ID, sourceRoot: '.' }]);

    const ctx = createContext({});
    await handler(ctx);

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
    mockResolveMoonAffectedComparison.mockResolvedValue({
      base: baseSha,
      baseRef: 'GITHUB_PR_MERGE_BASE',
      head: 'HEAD',
      headRef: 'HEAD',
    });
    mockGetAffectedMoonProjects.mockResolvedValue([{ id: 'foo', sourceRoot: 'packages/foo' }]);
    mockIsCiEnvironment.mockReturnValue(true);

    const ctx = createContext({});
    ctx.procRunner.run.mockRejectedValue(new Error('tsc failed'));

    await expect(handler(ctx)).rejects.toThrow(
      `Type check failed. Reproduce this run locally with:\n  node scripts/type_check --scope branch --test-mode affected --base-ref ${baseSha}`
    );
  });
});
