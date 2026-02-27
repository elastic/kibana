/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import {
  readArtifactsState,
  restoreTSBuildArtifacts,
  writeArtifactsState,
} from './src/archive/restore_ts_build_artifacts';
import { detectLocalChanges, isCiEnvironment, resolveCurrentCommitSha } from './src/archive/utils';
import { detectStaleArtifacts } from './src/detect_stale_artifacts';
import { createTypeCheckConfigs } from './src/create_type_check_configs';
import { runTsc, runTscFastPass } from './src/run_tsc';
import { cleanCache } from './src/clean_cache';

run(
  async ({ log, flagsReader, procRunner }) => {
    const scriptStart = Date.now();

    const isVerbose = flagsReader.boolean('verbose');
    const projectFilter = flagsReader.path('project');
    const shouldRestoreOnly = flagsReader.boolean('restore-artifacts');
    const extendedDiagnostics = flagsReader.boolean('extended-diagnostics');
    const shouldCleanCache = flagsReader.boolean('clean-cache');
    const shouldUseArchive = flagsReader.boolean('with-archive');
    const onlyDetectStale = flagsReader.boolean('only-detect-stale');

    const useProgressBar = !isCiEnvironment() && !isVerbose;

    if (shouldRestoreOnly) {
      await restoreTSBuildArtifacts(log);
      return;
    }

    if (shouldCleanCache) {
      await cleanCache();
      log.info('Deleted all TypeScript caches');
    }

    // Lazy-load so --help can run before TS project metadata is available.
    const { TS_PROJECTS } = await import('@kbn/ts-projects');
    const { updateRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import('./root_refs_config');

    await Promise.all([
      updateRootRefsConfig(log),
      shouldUseArchive ? restoreTSBuildArtifacts(log) : Promise.resolve(),
    ]);

    const projectsToCheck = TS_PROJECTS.filter(
      (p) => !p.isTypeCheckDisabled() && (!projectFilter || p.path === projectFilter)
    );

    if (projectFilter && projectsToCheck.length === 0) {
      throw createFailError(`No type-checkable project found at path: ${projectFilter}`);
    }

    if (onlyDetectStale) {
      const state = await readArtifactsState();
      if (!state) {
        throw createFailError(
          '--only-detect-stale found no artifact state on disk. ' +
            'Run with --with-archive first to restore artifacts and record their commit SHA.'
        );
      }
      const stale = await detectStaleArtifacts(
        REPO_ROOT,
        state.restoredSha,
        'HEAD',
        TS_PROJECTS.map((p) => p.path)
      );

      const shortSha = state.restoredSha.slice(0, 12);

      if (stale.size === 0) {
        log.info(`All artifacts are up-to-date (comparing ${shortSha} → HEAD).`);
      } else {
        log.info(`${stale.size} project(s) have stale artifacts (comparing ${shortSha} → HEAD):`);
        for (const tsConfigPath of [...stale].sort()) {
          log.info(`  ${Path.relative(REPO_ROOT, tsConfigPath)}`);
        }
      }

      return;
    }

    await createTypeCheckConfigs(log, projectsToCheck, TS_PROJECTS);

    // ── Type checking ──────────────────────────────────────────────────────────
    let didTypeCheckFail = false;

    // Fail-fast pass: type-check only the projects with local changes so the
    // engineer gets immediate feedback (~10-15 s) before the full build runs.
    if (!isCiEnvironment() && !projectFilter) {
      didTypeCheckFail = !(await runTscFastPass({
        projects: projectsToCheck,
        log,
        procRunner,
        procRunnerKey: 'tsc-fast',
        options: { isVerbose, extendedDiagnostics, useProgressBar },
      }));
    }

    if (!didTypeCheckFail) {
      const configPath = Path.relative(
        REPO_ROOT,
        projectFilter ? projectsToCheck[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
      );

      // +1 for the root refs config that references all projects.
      log.info(`[Full pass] Checking ${projectsToCheck.length + 1} projects...`);

      didTypeCheckFail = !(await runTsc({
        procRunner,
        procRunnerKey: 'tsc',
        log,
        configPaths: [configPath],
        options: {
          isVerbose,
          extendedDiagnostics,
          useProgressBar,
        },
      }));
    }

    // ── Post-check ─────────────────────────────────────────────────────────────
    if (shouldUseArchive) {
      const [hasLocalChanges, headSha] = await Promise.all([
        detectLocalChanges(),
        resolveCurrentCommitSha(),
      ]);

      if (hasLocalChanges) {
        const message = `uncommitted changes were detected after the TypeScript build. TypeScript cache artifacts must be generated from a clean working tree.`;
        if (isCiEnvironment()) {
          throw new Error(`Canceling TypeScript cache archive because ${message}`);
        } else {
          log.warning(`Skipping TypeScript cache archive because ${message}`);
        }
      } else {
        await archiveTSBuildArtifacts(log);

        // Update the state file so --only-detect-stale reflects the HEAD SHA
        // that was just archived, not the older restore SHA.
        if (headSha) {
          await writeArtifactsState(headSha);
        }
      }
    } else {
      log.verbose('Skipping TypeScript cache archive because --with-archive was not provided.');
    }

    const elapsed = ((Date.now() - scriptStart) / 1000).toFixed(1);
    log.info(`Total elapsed time: ${elapsed}s`);

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
        'extended-diagnostics',
        'with-archive',
        'restore-artifacts',
        'only-detect-stale',
      ],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
        --help                  Show this message
        --clean-cache           Delete all TypeScript caches and generated config files, then perform a
                                  full type check.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --only-detect-stale     Analyse the artifacts on the filesystem to determine which projects are
                                  stale relative to the current HEAD. Reads the commit SHA recorded when
                                  artifacts were last restored; run with --with-archive first if no state
                                  has been recorded yet.
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
