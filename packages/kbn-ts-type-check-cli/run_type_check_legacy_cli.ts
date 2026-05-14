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
import { asyncForEachWithLimit } from '@kbn/std';

import {
  cleanTypeCheckCaches,
  createTypeCheckConfigs,
  detectLocalChanges,
  TSC_LABEL,
} from './execute_type_check_validation';
import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import { restoreTSBuildArtifacts } from './src/archive/restore_ts_build_artifacts';
import { isCiEnvironment } from './src/archive/utils';
import { normalizeProjectPath } from './src/normalize_project_path';

/** Runs the legacy direct-target `scripts/type_check` CLI flow. */
export const runLegacyTypeCheckCli = () => {
  run(
    async ({ log, flagsReader, procRunner }) => {
      const { TS_PROJECTS } = await import('@kbn/ts-projects');
      const shouldCleanCache = flagsReader.boolean('clean-cache');
      const withArchive = flagsReader.boolean('with-archive');
      const shouldRestoreArchive = withArchive || flagsReader.boolean('restore-archive');
      const shouldUploadArchive = withArchive || flagsReader.boolean('upload-archive');

      if (shouldCleanCache) {
        await cleanTypeCheckCaches(log, TS_PROJECTS);
        return;
      }

      const { updateRootRefsConfig, cleanupRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import(
        './root_refs_config'
      );

      // If the tsconfig.refs.json file is not self-managed then make sure it has
      // a reference to every composite project in the repo.
      await updateRootRefsConfig(log);

      if (shouldRestoreArchive) {
        await restoreTSBuildArtifacts(log);
      } else {
        log.verbose(
          'Skipping TypeScript cache restore because --restore-archive was not provided.'
        );
      }

      const projectFilter = normalizeProjectPath(flagsReader.path('project'), log);
      const projects = TS_PROJECTS.filter(
        (project) =>
          !project.isTypeCheckDisabled() && (!projectFilter || project.path === projectFilter)
      );

      const createdConfigs = await createTypeCheckConfigs(log, projects, TS_PROJECTS);
      let tscFailed = false;
      try {
        log.info(
          'Building TypeScript projects to check types (For visible, though excessive, progress info you can pass --verbose)'
        );

        const buildTarget = Path.relative(
          REPO_ROOT,
          projects.length === 1 ? projects[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
        );

        await procRunner.run(TSC_LABEL, {
          cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
          args: [
            '-b',
            buildTarget,
            '--pretty',
            ...(flagsReader.boolean('verbose') ? ['--verbose'] : []),
            ...(flagsReader.boolean('extended-diagnostics') ? ['--extendedDiagnostics'] : []),
          ],
          env: {
            NODE_OPTIONS: '--max-old-space-size=12288',
          },
          cwd: REPO_ROOT,
          wait: true,
        });
      } catch {
        tscFailed = true;
      }

      try {
        const localChanges = shouldUploadArchive ? await detectLocalChanges() : [];
        const hasLocalChanges = localChanges.length > 0;

        if (shouldUploadArchive) {
          if (hasLocalChanges) {
            const changedFiles = localChanges.join('\n');
            const message = `uncommitted changes were detected after the TypeScript build. TypeScript cache artifacts must be generated from a clean working tree.\nChanged files:\n${changedFiles}`;

            if (isCiEnvironment()) {
              throw new Error(`Cancelling TypeScript cache archive because ${message}`);
            }

            log.info(`Skipping TypeScript cache archive because ${message}`);
          } else {
            await archiveTSBuildArtifacts(log);
          }
        } else {
          log.verbose(
            'Skipping TypeScript cache archive because --upload-archive was not provided.'
          );
        }
      } finally {
        if (flagsReader.boolean('cleanup')) {
          log.verbose('cleaning up');
          await cleanupRootRefsConfig();

          await asyncForEachWithLimit(createdConfigs, 40, async (path) => {
            await Fsp.unlink(path);
          });
        }
      }

      if (tscFailed) {
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
          'restore-archive',
          'upload-archive',
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
        --restore-archive       Restore cached artifacts from GCS before running tsc
        --upload-archive        Upload resulting artifacts to GCS after a successful tsc run
        --with-archive          Shorthand for \`--restore-archive --upload-archive\`
      `,
      },
    }
  );
};
