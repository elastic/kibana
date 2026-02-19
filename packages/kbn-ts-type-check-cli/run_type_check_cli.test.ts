/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';

jest.mock('@kbn/dev-cli-runner', () => ({ run: jest.fn() }));
jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: jest.fn((msg: string) => new Error(msg)),
}));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));
jest.mock('@kbn/std', () => ({
  asyncForEachWithLimit: jest.fn(),
  asyncMapWithLimit: jest.fn().mockResolvedValue([]),
}));

jest.mock('./src/archive/archive_ts_build_artifacts', () => ({
  archiveTSBuildArtifacts: jest.fn(),
}));
jest.mock('./src/archive/restore_ts_build_artifacts', () => ({
  restoreTSBuildArtifacts: jest.fn(),
}));
jest.mock('./src/archive/constants', () => ({ LOCAL_CACHE_ROOT: '/tmp/cache' }));
jest.mock('./src/archive/utils', () => ({
  detectLocalChanges: jest.fn().mockResolvedValue(false),
  isCiEnvironment: jest.fn().mockReturnValue(false),
}));
jest.mock('./src/run_tsc_with_progress', () => ({
  runTscWithProgress: jest.fn().mockResolvedValue(true),
}));
jest.mock('./root_refs_config', () => ({
  getChangedFiles: jest.fn().mockResolvedValue(new Set()),
  getAffectedProjectRefs: jest.fn().mockReturnValue(new Set()),
  updateRootRefsConfig: jest.fn(),
  cleanupRootRefsConfig: jest.fn(),
  ROOT_REFS_CONFIG_PATH: '/repo/tsconfig.refs.json',
}));

const { isCiEnvironment, detectLocalChanges } = jest.requireMock('./src/archive/utils') as {
  isCiEnvironment: jest.MockedFunction<() => boolean>;
  detectLocalChanges: jest.MockedFunction<() => Promise<boolean>>;
};
const { restoreTSBuildArtifacts } = jest.requireMock(
  './src/archive/restore_ts_build_artifacts'
) as {
  restoreTSBuildArtifacts: jest.MockedFunction<(log: SomeDevLog) => Promise<void>>;
};
const { archiveTSBuildArtifacts } = jest.requireMock(
  './src/archive/archive_ts_build_artifacts'
) as {
  archiveTSBuildArtifacts: jest.MockedFunction<(log: SomeDevLog) => Promise<void>>;
};
const { asyncForEachWithLimit } = jest.requireMock('@kbn/std') as {
  asyncForEachWithLimit: jest.MockedFunction<(...args: unknown[]) => Promise<void>>;
};
const { cleanupRootRefsConfig } = jest.requireMock('./root_refs_config') as {
  cleanupRootRefsConfig: jest.MockedFunction<() => Promise<void>>;
};
const { getChangedFiles, getAffectedProjectRefs } = jest.requireMock('./root_refs_config') as {
  getChangedFiles: jest.MockedFunction<() => Promise<Set<string>>>;
  getAffectedProjectRefs: jest.MockedFunction<(files: Set<string>, refs: string[]) => Set<string>>;
};
const { runTscWithProgress } = jest.requireMock('./src/run_tsc_with_progress') as {
  runTscWithProgress: jest.MockedFunction<(opts: Record<string, unknown>) => Promise<boolean>>;
};
const { run } = jest.requireMock('@kbn/dev-cli-runner') as {
  run: jest.MockedFunction<(fn: Function, opts: unknown) => void>;
};

const createLog = (): SomeDevLog =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as SomeDevLog);

const createProcRunner = () => ({
  run: jest.fn().mockResolvedValue(undefined),
});

const makeFlagsReader = (overrides: Record<string, unknown> = {}) => ({
  boolean: jest.fn((name: string) => overrides[name] ?? false),
  path: jest.fn((name: string) => overrides[name] ?? undefined),
});

const makeProject = (name: string, dir: string): TsProject =>
  ({
    path: `${dir}/tsconfig.json`,
    directory: `/repo/${dir}`,
    typeCheckConfigPath: `/repo/${dir}/tsconfig.type_check.json`,
    isTypeCheckDisabled: () => false,
    repoRel: dir,
    config: { compilerOptions: {} },
    getBase: () => undefined,
    getKbnRefs: () => [],
  } as unknown as TsProject);

// Import the module AFTER all mocks are in place — this triggers the
// top-level `run()` call which we intercept via the mock above.

require('./run_type_check_cli');

// `run` was called with (callback, options). Grab the callback.
const runCallback = run.mock.calls[0][0] as (ctx: {
  log: SomeDevLog;
  flagsReader: ReturnType<typeof makeFlagsReader>;
  procRunner: ReturnType<typeof createProcRunner>;
}) => Promise<void>;

// Stub TS_PROJECTS at the module level so the dynamic import resolves.
jest.mock('@kbn/ts-projects', () => ({
  TS_PROJECTS: [
    makeProject('streams_app', 'x-pack/plugins/streams_app'),
    makeProject('kbn-std', 'src/packages/kbn-std'),
    makeProject('kbn-utils', 'src/packages/kbn-utils'),
  ],
}));

describe('type_check orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isCiEnvironment.mockReturnValue(false);
    detectLocalChanges.mockResolvedValue(false);
    getChangedFiles.mockResolvedValue(new Set());
    getAffectedProjectRefs.mockReturnValue(new Set());
    runTscWithProgress.mockResolvedValue(true);
    restoreTSBuildArtifacts.mockResolvedValue(undefined);
    archiveTSBuildArtifacts.mockResolvedValue(undefined);
    asyncForEachWithLimit.mockResolvedValue(undefined);
  });

  describe('early exits', () => {
    it('--restore-artifacts: restores artifacts and returns without type checking', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'restore-artifacts': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log);
      expect(runTscWithProgress).not.toHaveBeenCalled();
      expect(procRunner.run).not.toHaveBeenCalled();
    });

    it('--clean-cache: deletes caches and returns without type checking', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'clean-cache': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(log.warning).toHaveBeenCalledWith('Deleted all TypeScript caches');
      expect(runTscWithProgress).not.toHaveBeenCalled();
      expect(procRunner.run).not.toHaveBeenCalled();
    });
  });

  describe('--with-archive', () => {
    it('restores artifacts before the type check', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      await runCallback({ log, flagsReader, procRunner });

      expect(restoreTSBuildArtifacts).toHaveBeenCalledWith(log);
    });

    it('archives artifacts after a successful type check on a clean tree', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      detectLocalChanges.mockResolvedValue(false);

      await runCallback({ log, flagsReader, procRunner });

      expect(archiveTSBuildArtifacts).toHaveBeenCalledWith(log);
    });

    it('skips archiving when local changes are detected (not CI)', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      detectLocalChanges.mockResolvedValue(true);

      await runCallback({ log, flagsReader, procRunner });

      expect(archiveTSBuildArtifacts).not.toHaveBeenCalled();
    });

    it('throws when local changes are detected on CI', async () => {
      isCiEnvironment.mockReturnValue(true);

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ 'with-archive': true });

      detectLocalChanges.mockResolvedValue(true);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow(
        'uncommitted changes were detected'
      );

      expect(archiveTSBuildArtifacts).not.toHaveBeenCalled();
    });
  });

  describe('not on CI', () => {
    it('with --project filter: runs tsc on the single project, no fail-fast pass', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ project: 'x-pack/plugins/streams_app/tsconfig.json' });

      await runCallback({ log, flagsReader, procRunner });

      expect(getChangedFiles).not.toHaveBeenCalled();
      expect(runTscWithProgress).toHaveBeenCalledTimes(1);
      expect(runTscWithProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            '-b',
            expect.stringContaining('streams_app/tsconfig.type_check.json'),
          ]),
        })
      );
    });

    it('without --project filter + changed files: runs fail-fast pass then full pass', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      getChangedFiles.mockResolvedValue(new Set(['x-pack/plugins/streams_app/public/index.ts']));
      getAffectedProjectRefs.mockReturnValue(
        new Set(['./x-pack/plugins/streams_app/tsconfig.type_check.json'])
      );

      await runCallback({ log, flagsReader, procRunner });

      // First call: fail-fast pass (affected project)
      // Second call: full pass (all projects)
      expect(runTscWithProgress).toHaveBeenCalledTimes(2);

      const firstCallArgs = runTscWithProgress.mock.calls[0][0] as { args: string[] };
      expect(firstCallArgs.args).toContain('x-pack/plugins/streams_app/tsconfig.type_check.json');
      expect(firstCallArgs.args).not.toContain('tsconfig.refs.json');

      const secondCallArgs = runTscWithProgress.mock.calls[1][0] as { args: string[] };
      expect(secondCallArgs.args).toContain('tsconfig.refs.json');
    });

    it('without --project filter + no changed files: skips fail-fast, runs full pass only', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      getChangedFiles.mockResolvedValue(new Set());
      getAffectedProjectRefs.mockReturnValue(new Set());

      await runCallback({ log, flagsReader, procRunner });

      // Only full pass — fail-fast returned early (no affected projects)
      expect(runTscWithProgress).toHaveBeenCalledTimes(1);

      const callArgs = runTscWithProgress.mock.calls[0][0] as { args: string[] };
      expect(callArgs.args).toContain('tsconfig.refs.json');
    });

    it('fail-fast pass fails: reports error and skips the full pass', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      getChangedFiles.mockResolvedValue(new Set(['x-pack/plugins/streams_app/public/index.ts']));
      getAffectedProjectRefs.mockReturnValue(
        new Set(['./x-pack/plugins/streams_app/tsconfig.type_check.json'])
      );

      // First call (fail-fast) fails
      runTscWithProgress.mockResolvedValueOnce(false);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow(
        'Unable to build TS project refs'
      );

      expect(log.error).toHaveBeenCalledWith('Type errors found in locally changed projects.');

      // Full pass never ran
      expect(runTscWithProgress).toHaveBeenCalledTimes(1);
    });

    it('full build fails: throws createFailError', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      // No changed files → skip fail-fast, full build fails
      runTscWithProgress.mockResolvedValueOnce(false);

      await expect(runCallback({ log, flagsReader, procRunner })).rejects.toThrow(
        'Unable to build TS project refs'
      );

      expect(runTscWithProgress).toHaveBeenCalledTimes(1);
    });
  });

  describe('on CI', () => {
    it('skips fail-fast pass, runs full pass only', async () => {
      isCiEnvironment.mockReturnValue(true);

      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader();

      getChangedFiles.mockResolvedValue(new Set(['x-pack/plugins/streams_app/public/index.ts']));

      await runCallback({ log, flagsReader, procRunner });

      // No fail-fast pass — getChangedFiles should not be called
      expect(getChangedFiles).not.toHaveBeenCalled();

      // Full pass ran via procRunner (CI uses verbose mode, not progress bar)
      expect(procRunner.run).toHaveBeenCalledTimes(1);
      expect(procRunner.run).toHaveBeenCalledWith(
        'tsc',
        expect.objectContaining({
          args: expect.arrayContaining(['-b', 'tsconfig.refs.json']),
        })
      );
    });
  });

  describe('--cleanup', () => {
    it('removes generated config files and root refs config', async () => {
      const log = createLog();
      const procRunner = createProcRunner();
      const flagsReader = makeFlagsReader({ cleanup: true });

      await runCallback({ log, flagsReader, procRunner });

      expect(log.verbose).toHaveBeenCalledWith('cleaning up');
      expect(cleanupRootRefsConfig).toHaveBeenCalled();
    });
  });
});
