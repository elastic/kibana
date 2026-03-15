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
import type { ProcRunner } from '@kbn/dev-proc-runner';
import {
  buildValidationCliArgs,
  describeValidationNoTargetsScope,
  describeValidationScoping,
  formatReproductionCommand,
  readValidationRunFlags,
  resolveValidationAffectedProjects,
  resolveValidationBaseContext,
  type ValidationBaseContext,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from '@kbn/dev-validation-runner';
import { normalizeRepoRelativePath } from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import type { ToolingLog } from '@kbn/tooling-log';
import type { TsProject } from '@kbn/ts-projects';

import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import { restoreTSBuildArtifacts } from './src/archive/restore_ts_build_artifacts';
import { LOCAL_CACHE_ROOT } from './src/archive/constants';
import { isCiEnvironment } from './src/archive/utils';
import { normalizeProjectPath, formatPathForLog } from './src/normalize_project_path';

export const TSC_LABEL = 'tsc';

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

const ROOT_TYPE_CHECK_FULL_RUN_FILES = new Set([
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.base.type_check.json',
  'tsconfig.browser.json',
  'tsconfig.refs.json',
  'tsconfig.type_check.json',
]);

const isRootTypeCheckTriggerFile = (repoRelPath: string) => {
  const normalizedPath = normalizeRepoRelativePath(repoRelPath);

  if (normalizedPath.startsWith('typings/')) {
    return true;
  }

  return !normalizedPath.includes('/') && ROOT_TYPE_CHECK_FULL_RUN_FILES.has(normalizedPath);
};

const getRootTypeCheckTriggerFiles = ({
  changedFiles,
  isRootProjectAffected,
}: {
  changedFiles: string[];
  isRootProjectAffected: boolean;
}) => {
  if (!isRootProjectAffected) {
    return [];
  }

  return changedFiles.filter(isRootTypeCheckTriggerFile);
};

async function createTypeCheckConfigs(
  log: ToolingLog,
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
  const execa = (await import('execa')).default;
  const { stdout } = await execa('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
  });

  return stdout.trim().length > 0;
}

async function cleanTypeCheckCaches(log: ToolingLog, projects: TsProject[]) {
  await asyncForEachWithLimit(projects, 10, async (proj) => {
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
}

type ProcRunnerLike = Pick<ProcRunner, 'run'>;

export interface TscValidationResult {
  projectCount: number;
}

export interface ExecuteTypeCheckValidationOptions {
  baseContext: ValidationBaseContext;
  log: ToolingLog;
  procRunner: ProcRunnerLike;
  cleanup?: boolean;
  extendedDiagnostics?: boolean;
  pretty?: boolean;
  verbose?: boolean;
  withArchive?: boolean;
}

export const executeTypeCheckValidation = async ({
  baseContext,
  log,
  procRunner,
  cleanup = false,
  extendedDiagnostics = false,
  pretty = true,
  verbose = false,
  withArchive = false,
}: ExecuteTypeCheckValidationOptions): Promise<TscValidationResult | null> => {
  // Lazy-load so reusable consumers can avoid TS project metadata work until needed.
  const { TS_PROJECTS } = await import('@kbn/ts-projects');

  const allTypeCheckProjects = TS_PROJECTS.filter((project) => !project.isTypeCheckDisabled());

  let selectedProjects = allTypeCheckProjects;
  let shouldRunAllProjects = false;
  let reproductionCommand: string;

  if (baseContext.mode === 'direct_target') {
    selectedProjects = allTypeCheckProjects.filter(
      (project) => project.path === baseContext.directTarget
    );

    if (selectedProjects.length === 0) {
      throw createFailError(
        `Could not find a TypeScript project at '${baseContext.directTarget}'.`
      );
    }

    const directTargetForLog = formatPathForLog(baseContext.directTarget);
    const cliArgs = buildValidationCliArgs({
      directTarget: { flag: '--project', value: directTargetForLog },
    });
    reproductionCommand = formatReproductionCommand('type_check', cliArgs.reproductionArgs);
    log.info(`Running \`${formatReproductionCommand('type_check', cliArgs.logArgs)}\``);
  } else {
    const { runContext } = baseContext;

    if (runContext.kind === 'skip') {
      selectedProjects = [];
    } else if (runContext.kind === 'full' || baseContext.contract.testMode === 'all') {
      shouldRunAllProjects = true;
      selectedProjects = allTypeCheckProjects;
    } else if (runContext.changedFiles.length === 0) {
      selectedProjects = [];
    } else {
      const changedFilesJson = JSON.stringify({ files: runContext.changedFiles });
      const affectedProjectsContext = await resolveValidationAffectedProjects({
        changedFilesJson,
        downstream: baseContext.contract.downstream,
      });
      const rootTypeCheckTriggerFiles = getRootTypeCheckTriggerFiles({
        changedFiles: runContext.changedFiles,
        isRootProjectAffected: affectedProjectsContext.isRootProjectAffected,
      });

      if (rootTypeCheckTriggerFiles.length > 0) {
        log.info(
          `Root TypeScript inputs changed (${rootTypeCheckTriggerFiles.join(
            ', '
          )}); escalating to full type check of all projects.`
        );
        shouldRunAllProjects = true;
        selectedProjects = allTypeCheckProjects;
      } else {
        const affectedMoonSourceRoots = new Set(
          affectedProjectsContext.affectedSourceRoots.map((sourceRoot) =>
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
      return null;
    }

    log.info(
      describeValidationScoping({
        baseContext,
        targetCount: shouldRunAllProjects ? allTypeCheckProjects.length : selectedProjects.length,
      })
    );

    const resolvedBase = runContext.kind === 'affected' ? runContext.resolvedBase : undefined;
    const cliArgs = buildValidationCliArgs({
      contract: baseContext.contract,
      resolvedBase,
      forceFullProfile: shouldRunAllProjects,
    });

    reproductionCommand = formatReproductionCommand('type_check', cliArgs.reproductionArgs);
    log.info(`Running \`${formatReproductionCommand('type_check', cliArgs.logArgs)}\``);
  }

  // Setup + execute wrapped so cleanup always runs even if setup partially fails
  const { updateRootRefsConfig, ROOT_REFS_CONFIG_PATH } = await import('./root_refs_config');

  let rootRefsConfigCreated = false;
  let createdConfigs = new Set<string>();
  let tscFailed = false;

  try {
    if (shouldRunAllProjects) {
      await updateRootRefsConfig(log);
      rootRefsConfigCreated = true;
    }

    if (withArchive) {
      await restoreTSBuildArtifacts(log);
    } else {
      log.verbose('Skipping TypeScript cache restore because --with-archive was not provided.');
    }

    createdConfigs = await createTypeCheckConfigs(log, selectedProjects, TS_PROJECTS);

    const buildTargets = shouldRunAllProjects
      ? [Path.relative(REPO_ROOT, ROOT_REFS_CONFIG_PATH)]
      : [
          ...new Set(
            selectedProjects.map((project) => Path.relative(REPO_ROOT, project.typeCheckConfigPath))
          ),
        ].sort((left, right) => left.localeCompare(right));

    if (buildTargets.length > 0) {
      await procRunner.run(TSC_LABEL, {
        cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
        args: [
          '-b',
          ...buildTargets,
          ...(pretty ? ['--pretty'] : []),
          ...(verbose ? ['--verbose'] : []),
          ...(extendedDiagnostics ? ['--extendedDiagnostics'] : []),
        ],
        env: {
          NODE_OPTIONS: '--max-old-space-size=12288',
        },
        cwd: REPO_ROOT,
        wait: true,
      });
    }
  } catch {
    tscFailed = true;
  }

  // Cleanup always runs, even if setup or tsc failed partway through
  try {
    // Archive artifacts (only after successful tsc)
    if (withArchive && !tscFailed) {
      const hasLocalChanges = await detectLocalChanges();
      if (hasLocalChanges) {
        const message = `uncommitted changes were detected after the TypeScript build. TypeScript cache artifacts must be generated from a clean working tree.`;

        if (isCiEnvironment()) {
          throw new Error(`Canceling TypeScript cache archive because ${message}`);
        }

        log.info(`Skipping TypeScript cache archive because ${message}`);
      } else {
        await archiveTSBuildArtifacts(log);
      }
    } else if (!withArchive) {
      log.verbose('Skipping TypeScript cache archive because --with-archive was not provided.');
    }
  } finally {
    if (cleanup) {
      log.verbose('cleaning up');

      if (rootRefsConfigCreated) {
        const { cleanupRootRefsConfig } = await import('./root_refs_config');
        await cleanupRootRefsConfig();
      }

      await asyncForEachWithLimit(createdConfigs, 40, async (path) => {
        await Fsp.unlink(path);
      });
    }
  }

  if (tscFailed) {
    if (isCiEnvironment()) {
      throw createFailError(
        `${TSC_LABEL} failed. Reproduce this run locally with:\n  ${reproductionCommand}`
      );
    }

    throw createFailError('Unable to build TS project refs');
  }

  return { projectCount: selectedProjects.length };
};

export const runTypeCheckCli = () => {
  run(
    async ({ log, flagsReader, procRunner }) => {
      const { TS_PROJECTS } = await import('@kbn/ts-projects');
      const shouldCleanCache = flagsReader.boolean('clean-cache');

      if (shouldCleanCache) {
        await cleanTypeCheckCaches(log, TS_PROJECTS);
        return;
      }

      const projectFilter = normalizeProjectPath(flagsReader.path('project'), log);
      const validationRunFlags = readValidationRunFlags(flagsReader);
      const baseContext = await resolveValidationBaseContext({
        flags: validationRunFlags,
        directTarget: projectFilter,
        runnerDescription: 'type check',
        onWarning: (message) => log.warning(message),
      });

      await executeTypeCheckValidation({
        baseContext,
        log,
        procRunner,
        cleanup: flagsReader.boolean('cleanup'),
        extendedDiagnostics: flagsReader.boolean('extended-diagnostics'),
        verbose: flagsReader.boolean('verbose'),
        withArchive: flagsReader.boolean('with-archive'),
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

        # run the agent local profile
        node scripts/type_check --profile agent

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
};
