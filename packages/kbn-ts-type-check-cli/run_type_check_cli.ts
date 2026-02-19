/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import normalize from 'normalize-path';

import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import { restoreTSBuildArtifacts } from './src/archive/restore_ts_build_artifacts';
import { LOCAL_CACHE_ROOT } from './src/archive/constants';
import { detectLocalChanges, isCiEnvironment } from './src/archive/utils';
import { runTscWithProgress } from './src/run_tsc_with_progress';
import { getChangedFiles, getAffectedProjectRefs } from './root_refs_config';

run(
  async ({ log, flagsReader, procRunner }) => {
    // Lazy-load so --help can run before TS project metadata is available.
    const { TS_PROJECTS } = await import('@kbn/ts-projects');

    const shouldCleanup = flagsReader.boolean('cleanup');
    const shouldCleanCache = flagsReader.boolean('clean-cache');
    const shouldUseArchive = flagsReader.boolean('with-archive');
    const shouldRestoreOnly = flagsReader.boolean('restore-artifacts');

    const isVerbose = flagsReader.boolean('verbose');
    const projectFilter = flagsReader.path('project');

    const useProgressBar = !isCiEnvironment() && !isVerbose;

    if (shouldRestoreOnly) {
      await restoreTSBuildArtifacts(log);
      return;
    }

    if (shouldCleanCache) {
      await asyncForEachWithLimit(TS_PROJECTS, 10, async (proj) => {
        await Fsp.rm(Path.resolve(proj.directory, 'target/types'), {
          force: true,
          recursive: true,
        });
      });

      await Fsp.rm(LOCAL_CACHE_ROOT, {
        force: true,
        recursive: true,
      });

      log.warning('Deleted all TypeScript caches');

      return;
    }

    const { updateRootRefsConfig, cleanupRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import(
      './root_refs_config'
    );

    let restorePromise: Promise<void> = Promise.resolve();

    if (shouldUseArchive) {
      restorePromise = restoreTSBuildArtifacts(log);
    } else {
      log.verbose('Skipping TypeScript cache restore because --with-archive was not provided.');
    }

    await Promise.all([updateRootRefsConfig(log), restorePromise]);

    const projects = TS_PROJECTS.filter(
      (p) => !p.isTypeCheckDisabled() && (!projectFilter || p.path === projectFilter)
    );

    const created = await createTypeCheckConfigs(log, projects, TS_PROJECTS);

    let didTypeCheckFail = false;

    const tscCmd = Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc'));

    const sharedTscArgs = [
      '--pretty',
      ...(isVerbose ? ['--verbose'] : []),
      ...(flagsReader.boolean('extended-diagnostics') ? ['--extendedDiagnostics'] : []),
    ];
    const tscEnv = { NODE_OPTIONS: '--max-old-space-size=10240' };

    if (!isCiEnvironment() && !projectFilter) {
      // ---------------------------------------------------------------------
      // Fail-fast pass: type-check only the projects with local changes so the
      // engineer gets immediate feedback (~10-15 s) before the full build runs.
      // ---------------------------------------------------------------------
      didTypeCheckFail = await runFailFastCheck({
        log,
        procRunner,
        projects,
        sharedTscArgs,
        tscCmd,
        tscEnv,
        useProgressBar,
      });
    }

    // ---------------------------------------------------------------------
    // Now check all projects
    // ---------------------------------------------------------------------
    if (!didTypeCheckFail) {
      const tscOptions = {
        cmd: tscCmd,
        args: [
          '-b',
          Path.relative(
            REPO_ROOT,
            projectFilter ? projects[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
          ),
          ...sharedTscArgs,
        ],
        env: tscEnv,
        cwd: REPO_ROOT,
      };

      log.info(`[Full pass] Checking ${projects.length + 1} projects...`);

      if (useProgressBar) {
        didTypeCheckFail = !(await runTscWithProgress({ ...tscOptions, log }));
      } else {
        try {
          await procRunner.run('tsc', { ...tscOptions, wait: true });
        } catch (error) {
          didTypeCheckFail = true;
        }
      }
    }

    const hasLocalChanges = shouldUseArchive ? await detectLocalChanges() : false;

    if (shouldUseArchive) {
      if (hasLocalChanges) {
        const message = `uncommitted changes were detected after the TypeScript build. TypeScript cache artifacts must be generated from a clean working tree.`;

        if (isCiEnvironment()) {
          throw new Error(`Canceling TypeScript cache archive because ${message}`);
        }
      } else {
        await archiveTSBuildArtifacts(log);
      }
    } else {
      log.verbose('Skipping TypeScript cache archive because --with-archive was not provided.');
    }

    // cleanup if requested
    if (shouldCleanup) {
      log.verbose('cleaning up');
      await cleanupRootRefsConfig();

      await asyncForEachWithLimit(created, 40, async (path) => {
        await Fsp.unlink(path);
      });
    }

    if (didTypeCheckFail) {
      throw createFailError('Unable to build TS project refs');
    }
  },
  {
    description: `
      Run the TypeScript compiler without emitting files so that it can check types during development.

      Examples:
        # check types in all projects
        node scripts/type_check

        # check types in a single project
        node scripts/type_check --project packages/kbn-pm/tsconfig.json
    `,
    flags: {
      string: ['project'],
      boolean: [
        'clean-cache',
        'cleanup',
        'extended-diagnostics',
        'with-archive',
        'restore-artifacts',
      ],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
        --help                  Show this message
        --clean-cache           Delete any existing TypeScript caches before running type check
        --cleanup               Pass to avoid leaving temporary tsconfig files on disk. Leaving these
                                  files in place makes subsequent executions faster because ts can
                                  identify that none of the imports have changed (it uses creation/update
                                  times) but cleaning them prevents leaving garbage around the repo.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --with-archive          Restore cached artifacts before running and archive results afterwards.
                                  Locally, this will try to fetch from GCS first (requires gcloud auth login)
                                  and fall back to the local cache. Downloaded archives are cached locally
                                  for offline reuse.
        --restore-artifacts     Only restore cached build artifacts (from GCS or local cache) without
                                  running the type check. Useful for pre-populating the cache.
      `,
    },
  }
);

async function createTypeCheckConfigs(
  log: SomeDevLog,
  projects: TsProject[],
  allProjects: TsProject[]
) {
  const writes: Array<[path: string, content: string]> = [];

  // write tsconfig.type_check.json files for each project that is not the root
  const queue = new Set(projects);

  for (const project of queue) {
    const config = project.config;
    const base = project.getBase();
    if (base) {
      queue.add(base);
    }

    const typeCheckConfig = {
      ...config,
      extends: base ? rel(project.directory, base.typeCheckConfigPath) : undefined,
      compilerOptions: {
        ...config.compilerOptions,
        composite: true,
        rootDir: '.',
        noEmit: false,
        emitDeclarationOnly: true,
        paths: project.repoRel === 'tsconfig.base.json' ? config.compilerOptions?.paths : undefined,
      },
      kbn_references: undefined,
      references: project.getKbnRefs(allProjects).map((refd) => {
        queue.add(refd);

        return {
          path: rel(project.directory, refd.typeCheckConfigPath),
        };
      }),
    };

    writes.push([project.typeCheckConfigPath, JSON.stringify(typeCheckConfig, null, 2)]);
  }

  return new Set(
    await asyncMapWithLimit(writes, 50, async ([path, content]) => {
      try {
        const existing = await Fsp.readFile(path, 'utf8');
        if (existing === content) {
          return path;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }

      log.verbose('updating', path);
      await Fsp.writeFile(path, content, 'utf8');
      return path;
    })
  );
}

/**
 * Fail-fast pass: type-check only the projects with local changes so the
 * developer gets immediate feedback (~10-15 s) before the full build runs.
 * Returns `true` if type errors were found, `false` otherwise.
 */
export async function runFailFastCheck(options: {
  log: SomeDevLog;
  procRunner: ProcRunner;
  projects: TsProject[];
  sharedTscArgs: string[];
  tscCmd: string;
  tscEnv: Record<string, string>;
  useProgressBar: boolean;
}): Promise<boolean> {
  const { projects, tscCmd, sharedTscArgs, tscEnv, useProgressBar, log, procRunner } = options;

  const changedFiles = await getChangedFiles();

  const allRefs = projects.map(
    (p) => `./${normalize(Path.relative(REPO_ROOT, p.typeCheckConfigPath))}`
  );
  const affectedRefs = getAffectedProjectRefs(changedFiles, allRefs);

  if (affectedRefs.size === 0) {
    return false;
  }

  const affectedConfigs = [...affectedRefs].map((ref) =>
    Path.relative(REPO_ROOT, Path.resolve(REPO_ROOT, ref))
  );

  const projectNames = affectedConfigs.map((c) => {
    const parts = c.replace(/\\/g, '/').split('/');
    return parts.length >= 2 ? parts[parts.length - 2] : c;
  });

  const multi = affectedRefs.size > 1;

  log.info(
    `[First pass] Checking ${affectedRefs.size} changed ${
      multi ? 'projects' : 'project'
    } first (${projectNames.join(', ')}) with ${
      multi ? 'their' : 'its'
    } dependencies for fast feedback...`
  );

  const failFastOptions = {
    cmd: tscCmd,
    args: ['-b', ...affectedConfigs, ...sharedTscArgs],
    env: tscEnv,
    cwd: REPO_ROOT,
  };

  let failed = false;

  if (useProgressBar) {
    const success = await runTscWithProgress({ ...failFastOptions, log });
    if (!success) {
      failed = true;
    }
  } else {
    try {
      await procRunner.run('tsc-fast', { ...failFastOptions, wait: true });
    } catch {
      failed = true;
    }
  }

  if (failed) {
    log.error('Type errors found in locally changed projects.');
  }

  return failed;
}

const rel = (from: string, to: string) => {
  const path = Path.relative(from, to);
  return path.startsWith('.') ? path : `./${path}`;
};
