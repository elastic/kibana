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
import {
  buildValidationCliArgs,
  describeValidationNoTargetsScope,
  describeValidationScoping,
  formatReproductionCommand,
  readValidationRunFlags,
  resolveValidationBaseContext,
  runValidationCommand,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from '@kbn/dev-validation-runner';
import { normalizeRepoRelativePath, type MoonAffectedComparison } from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { TsProject } from '@kbn/ts-projects';
import execa from 'execa';

import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import { restoreTSBuildArtifacts } from './src/archive/restore_ts_build_artifacts';
import { LOCAL_CACHE_ROOT } from './src/archive/constants';
import { isCiEnvironment } from './src/archive/utils';
import { normalizeProjectPath, formatPathForLog } from './src/normalize_project_path';

const rel = (from: string, to: string) => {
  const path = Path.relative(from, to);
  return path.startsWith('.') ? path : `./${path}`;
};

const isTsProjectWithinMoonSourceRoots = (
  tsProject: TsProject,
  moonSourceRoots: Set<string>
): boolean => {
  if (moonSourceRoots.has('.')) {
    return true;
  }

  const projectRepoRelPath = normalizeRepoRelativePath(tsProject.repoRel);
  for (const sourceRoot of moonSourceRoots) {
    if (projectRepoRelPath === sourceRoot || projectRepoRelPath.startsWith(`${sourceRoot}/`)) {
      return true;
    }
  }

  return false;
};

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

async function detectLocalChanges(): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
  });

  return stdout.trim().length > 0;
}

run(
  async ({ log, flagsReader, procRunner }) => {
    // Lazy-load so --help can run before TS project metadata is available.
    const { TS_PROJECTS } = await import('@kbn/ts-projects');
    const shouldCleanCache = flagsReader.boolean('clean-cache');
    const shouldUseArchive = flagsReader.boolean('with-archive');
    const validationRunFlags = readValidationRunFlags(flagsReader);

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
      log.info('Cleaned existing TypeScript caches');
      return;
    }

    const projectFilter = normalizeProjectPath(flagsReader.path('project'), log);

    // Mutable state shared between beforeExecute/execute/afterExecute via closure.
    // Set in beforeExecute; left undefined when there's nothing to check (skip/empty).
    let typeCheckState:
      | {
          selectedProjects: TsProject[];
          shouldRunAllProjects: boolean;
          reproductionCommand: string;
          rootRefsConfigCreated?: boolean;
          createdConfigs?: Set<string>;
          buildTargets?: string[];
        }
      | undefined;

    const baseContext = await resolveValidationBaseContext({
      flags: validationRunFlags,
      directTarget: projectFilter,
      runnerDescription: 'type check',
      onWarning: (message) => log.warning(message),
    });

    await runValidationCommand({
      baseContext,

      beforeExecute: async () => {
        const allTypeCheckProjects = TS_PROJECTS.filter(
          (project) => !project.isTypeCheckDisabled()
        );

        let selectedProjects = allTypeCheckProjects;
        let shouldRunAllProjects = false;
        let directTargetForArgs: string | undefined;
        let branchComparison: MoonAffectedComparison | undefined;

        if (baseContext.mode === 'direct_target') {
          directTargetForArgs = baseContext.directTarget;
          selectedProjects = allTypeCheckProjects.filter(
            (project) => project.path === baseContext.directTarget
          );

          if (selectedProjects.length === 0) {
            throw createFailError(
              `Could not find a TypeScript project at '${directTargetForArgs}'.`
            );
          }
        } else {
          const { runContext } = baseContext;

          if (runContext.kind === 'skip') {
            selectedProjects = [];
          } else if (runContext.kind === 'full') {
            shouldRunAllProjects = true;
            selectedProjects = allTypeCheckProjects;
          } else {
            branchComparison = runContext.comparison;

            if (runContext.isRootProjectAffected) {
              log.info('Root project is affected; escalating to full type check of all projects.');
              shouldRunAllProjects = true;
              selectedProjects = allTypeCheckProjects;
            } else {
              const affectedMoonSourceRoots = new Set(
                runContext.affectedSourceRoots.map((sourceRoot) =>
                  normalizeRepoRelativePath(sourceRoot)
                )
              );

              selectedProjects = allTypeCheckProjects.filter((project) =>
                isTsProjectWithinMoonSourceRoots(project, affectedMoonSourceRoots)
              );
            }
          }

          if (selectedProjects.length === 0) {
            log.info(
              `No affected TypeScript projects found ${describeValidationNoTargetsScope(
                baseContext
              )}; skipping type check.`
            );
            return;
          }
        }

        log.info(
          describeValidationScoping({
            baseContext,
            targetCount: shouldRunAllProjects
              ? allTypeCheckProjects.length
              : selectedProjects.length,
          })
        );

        const cliArgs = buildValidationCliArgs({
          contract: baseContext.contract,
          comparison: branchComparison,
          directTarget: directTargetForArgs
            ? { flag: '--project', value: formatPathForLog(directTargetForArgs) }
            : undefined,
          forceFullProfile: shouldRunAllProjects,
        });

        log.info(`cmd: ${formatReproductionCommand('type_check', cliArgs.logArgs)}`);

        // Store state for execute/afterExecute via closure
        typeCheckState = {
          selectedProjects,
          shouldRunAllProjects,
          reproductionCommand: formatReproductionCommand('type_check', cliArgs.reproductionArgs),
        };

        const { updateRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import('./root_refs_config');

        if (shouldRunAllProjects) {
          await updateRootRefsConfig(log);
          typeCheckState.rootRefsConfigCreated = true;
        }

        if (shouldUseArchive) {
          await restoreTSBuildArtifacts(log);
        } else {
          log.verbose('Skipping TypeScript cache restore because --with-archive was not provided.');
        }

        const created = await createTypeCheckConfigs(log, selectedProjects, TS_PROJECTS);
        typeCheckState.createdConfigs = created;

        const buildTargets = shouldRunAllProjects
          ? [Path.relative(REPO_ROOT, ROOT_REFS_CONFIG_PATH)]
          : [
              ...new Set(
                selectedProjects.map((project) =>
                  Path.relative(REPO_ROOT, project.typeCheckConfigPath)
                )
              ),
            ].sort((left, right) => left.localeCompare(right));
        typeCheckState.buildTargets = buildTargets;
      },

      execute: async () => {
        if (!typeCheckState) {
          return;
        }

        await procRunner.run('tsc', {
          cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
          args: [
            '-b',
            ...typeCheckState.buildTargets!,
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
      },

      afterExecute: async () => {
        if (!typeCheckState) {
          return;
        }

        const hasLocalChanges = shouldUseArchive ? await detectLocalChanges() : false;

        if (shouldUseArchive) {
          if (hasLocalChanges) {
            const message = `uncommitted changes were detected after the TypeScript build. TypeScript cache artifacts must be generated from a clean working tree.`;

            if (isCiEnvironment()) {
              throw new Error(`Canceling TypeScript cache archive because ${message}`);
            }

            log.info(`Skipping TypeScript cache archive because ${message}`);
          } else {
            await archiveTSBuildArtifacts(log);
          }
        } else {
          log.verbose('Skipping TypeScript cache archive because --with-archive was not provided.');
        }

        if (flagsReader.boolean('cleanup')) {
          log.verbose('cleaning up');

          if (typeCheckState.rootRefsConfigCreated) {
            const { cleanupRootRefsConfig } = await import('./root_refs_config');
            await cleanupRootRefsConfig();
          }

          if (typeCheckState.createdConfigs) {
            await asyncForEachWithLimit(typeCheckState.createdConfigs, 40, async (path) => {
              await Fsp.unlink(path);
            });
          }
        }
      },
    }).catch((error) => {
      if (!typeCheckState) {
        throw error;
      }

      if (isCiEnvironment()) {
        throw createFailError(
          `Type check failed. Reproduce this run locally with:\n  ${typeCheckState.reproductionCommand}`
        );
      }

      throw createFailError('Unable to build TS project refs');
    });
  },
  {
    description: `
      Run the TypeScript compiler without emitting files so that it can check types during development.

      Examples:
        # check types in branch-affected projects (default profile)
        node scripts/type_check

        # run the quick local profile
        node scripts/type_check --profile quick

        # run PR-equivalent affected selection
        node scripts/type_check --profile pr

        # check all TypeScript projects
        node scripts/type_check --profile full

        # branch scope with explicit refs
        node scripts/type_check --scope branch --base-ref origin/main --head-ref HEAD

        # check a single project directly
        node scripts/type_check --project packages/kbn-pm/tsconfig.json
    `,
    flags: {
      string: ['project', ...VALIDATION_RUN_STRING_FLAGS],
      boolean: ['clean-cache', 'cleanup', 'extended-diagnostics', 'with-archive'],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
${VALIDATION_RUN_HELP}
        --help                  Show this message
        --clean-cache           Delete any existing TypeScript caches before running type check
        --cleanup               Pass to avoid leaving temporary tsconfig files on disk. Leaving these
                                  files in place makes subsequent executions faster because ts can
                                  identify that none of the imports have changed (it uses creation/update
                                  times) but cleaning them prevents leaving garbage around the repo.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --with-archive          Restore cached artifacts before running and archive results afterwards
      `,
    },
  }
);
