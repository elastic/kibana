/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import Fsp from 'fs/promises';

import { createFailError } from '@kbn/dev-cli-errors';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import {
  buildValidationCliArgs,
  describeValidationNoTargetsScope,
  describeValidationScoping,
  formatReproductionCommand,
  resolveValidationAffectedProjects,
  type ValidationBaseContext,
} from '@kbn/dev-validation-runner';
import { normalizeRepoRelativePath } from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import type { ToolingLog } from '@kbn/tooling-log';
import { readTsConfig, type TsProject } from '@kbn/ts-projects';

import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import { restoreTSBuildArtifacts } from './src/archive/restore_ts_build_artifacts';
import { LOCAL_CACHE_ROOT } from './src/archive/constants';
import { isCiEnvironment } from './src/archive/utils';
import { formatPathForLog } from './src/normalize_project_path';

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

/**
 * Generates `tsconfig.type_check.json` files for the selected projects and any
 * referenced dependencies they need for a composite build.
 */
export async function createTypeCheckConfigs(
  log: ToolingLog,
  projects: TsProject[],
  allProjects: TsProject[],
  baseRootPaths?: Record<string, string[]>
) {
  const writes: Array<[path: string, content: string]> = [];

  // Identify bundledTypes projects so consumers can use path mappings instead of project references
  const bundledTypesProjects = allProjects.filter((p) => p.hasBundledTypes());
  const bundledTypesSet = new Set(bundledTypesProjects);

  // Resolve root paths upfront — consumers of bundledTypes packages need a full copy
  // with overrides, so they can't inherit from the root (child `paths` fully overrides parent).
  let rootPaths: Record<string, string[]> | undefined;
  if (bundledTypesProjects.length > 0) {
    rootPaths = baseRootPaths;
    if (!rootPaths) {
      const rootTsconfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.json');
      const rootTsconfig = readTsConfig(rootTsconfigPath);
      rootPaths = rootTsconfig.compilerOptions?.paths as Record<string, string[]> | undefined;
    }
  }

  // Identify consumers of bundledTypes — projects that reference a bundledTypes package.
  // These are relevant for the bundledTypes package itself: if it references a consumer,
  // we must use paths (not project references) to avoid the diamond dependency problem.
  // In composite mode, project reference .d.ts imports are resolved using the PRODUCING
  // project's settings. Using paths to pre-built .d.ts instead causes TypeScript to resolve
  // imports using the CONSUMING project's settings, ensuring type identity.
  const consumersOfBundledTypes = new Set<TsProject>();
  if (bundledTypesProjects.length > 0) {
    for (const p of allProjects) {
      if (bundledTypesSet.has(p)) continue;
      const refs = p.getKbnRefs(allProjects);
      if (refs.some((ref) => bundledTypesSet.has(ref))) {
        consumersOfBundledTypes.add(p);
      }
    }
  }

  // write tsconfig.type_check.json files for each project that is not the root
  const queue = new Set(projects);
  for (const project of queue) {
    const config = project.config;
    const base = project.getBase();
    if (base) {
      queue.add(base);
    }

    let paths: Record<string, string[]> | undefined =
      project.repoRel === 'tsconfig.base.json'
        ? (config.compilerOptions?.paths as Record<string, string[]> | undefined)
        : undefined;

    // Filter out project references to bundledTypes packages — consumers resolve
    // these via per-project paths overrides to the bundled .d.ts instead.
    const kbnRefs = project.getKbnRefs(allProjects);
    const bundledTypesRefs = kbnRefs.filter((refd) => bundledTypesSet.has(refd));
    let filteredRefs = kbnRefs.filter((refd) => !bundledTypesSet.has(refd));

    // For consumers of a bundledTypes package: add per-project paths overrides mapping
    // the bundledTypes package to its pre-built .d.ts and remove the project reference.
    // We also need to add the bundledTypes package's transitive dependencies as project
    // references so that their .d.ts output is available when TypeScript resolves imports
    // inside the pre-built .d.ts files.
    if (bundledTypesRefs.length > 0 && !bundledTypesSet.has(project)) {
      paths = undefined;
      for (const bp of bundledTypesRefs) {
        const pkgName = bp.rootImportReq;
        if (pkgName) {
          paths = paths ?? {};
          const bundledDtsPath = Path.join(Path.dirname(bp.repoRel), 'target/types/index.d.ts');
          paths[pkgName] = [bundledDtsPath];
          // Also override the wildcard subpath mapping so that imports like
          // @kbn/pkg/mocks or @kbn/pkg/internal resolve to compiled .d.ts
          // in target/types/ instead of source files.
          const typesWildcard = Path.join(Path.dirname(bp.repoRel), 'target/types/*');
          paths[`${pkgName}/*`] = [typesWildcard];

          // Add the bundledTypes package's own kbn_references as project references
          // to this consumer so their compiled .d.ts is available when TypeScript resolves
          // imports inside the pre-built .d.ts files.
          for (const transitiveDep of bp.getKbnRefs(allProjects)) {
            if (
              !bundledTypesSet.has(transitiveDep) &&
              !filteredRefs.includes(transitiveDep) &&
              transitiveDep !== project
            ) {
              filteredRefs.push(transitiveDep);
            }
          }
        }
      }
    }

    // For a bundledTypes package: resolve circular dependencies via paths instead
    // of project references to avoid the diamond dependency problem.
    if (bundledTypesSet.has(project) && rootPaths) {
      // kbn_references that are consumers of this bundledTypes package
      const circularConsumerRefs = filteredRefs.filter((ref) => consumersOfBundledTypes.has(ref));

      // typecheck_only_references: dependencies excluded from kbn_references (and Moon)
      // to avoid project graph cycles, but still needed for type-checking.
      const typeCheckOnlyRefs = project.getTypeCheckOnlyRefs(allProjects);

      const allCircularRefs = [...circularConsumerRefs, ...typeCheckOnlyRefs];
      if (allCircularRefs.length > 0) {
        paths = paths ?? { ...rootPaths };
        for (const cr of allCircularRefs) {
          const pkgName = cr.rootImportReq;
          if (pkgName) {
            const compiledDtsPath = Path.join(Path.dirname(cr.repoRel), 'target/types/index.d.ts');
            paths[pkgName] = [compiledDtsPath];
          }
        }
        filteredRefs = filteredRefs.filter((ref) => !consumersOfBundledTypes.has(ref));
      }
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
        paths,
      },
      kbn_references: undefined,
      typecheck_only_references: undefined,
      references: filteredRefs.map((refd) => {
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
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
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
 * Returns bundledTypes projects from allProjects that don't yet have pre-built .d.ts on disk.
 * These need to be built (tsc --noCheck) before consumers can resolve their path mappings.
 */
export const getBundledTypesProjectsNeedingBootstrap = (allProjects: TsProject[]): TsProject[] => {
  return allProjects.filter((p) => {
    if (!p.hasBundledTypes()) {
      return false;
    }
    const bundledDtsPath = Path.resolve(p.directory, 'target/types/index.d.ts');
    return !Fs.existsSync(bundledDtsPath);
  });
};

/**
 * Returns consumers of bundledTypes packages that are also referenced BY a bundledTypes package
 * (creating a circular dependency) and don't yet have compiled .d.ts on disk.
 * These need to be pre-built so the bundledTypes package can resolve them via paths.
 */
export const getCircularConsumersNeedingBootstrap = (allProjects: TsProject[]): TsProject[] => {
  const bundledTypesProjects = allProjects.filter((p) => p.hasBundledTypes());
  if (bundledTypesProjects.length === 0) return [];

  const bundledTypesSet = new Set(bundledTypesProjects);

  // Find consumers: projects that reference a bundledTypes package
  const consumers = new Set<TsProject>();
  for (const p of allProjects) {
    if (bundledTypesSet.has(p)) continue;
    if (p.getKbnRefs(allProjects).some((ref) => bundledTypesSet.has(ref))) {
      consumers.add(p);
    }
  }

  // Find circular consumers: consumers that are also referenced by a bundledTypes package
  // (via kbn_references or typecheck_only_references)
  const circularConsumers: TsProject[] = [];
  const seen = new Set<string>();
  for (const bp of bundledTypesProjects) {
    const allRefs = [...bp.getKbnRefs(allProjects), ...bp.getTypeCheckOnlyRefs(allProjects)];
    for (const ref of allRefs) {
      if (consumers.has(ref) && !seen.has(ref.path)) {
        seen.add(ref.path);
        const compiledDtsPath = Path.resolve(ref.directory, 'target/types/index.d.ts');
        if (!Fs.existsSync(compiledDtsPath)) {
          circularConsumers.push(ref);
        }
      }
    }
  }

  return circularConsumers;
};

/**
 * Bootstrap bundledTypes packages by building them with a non-composite
 * tsc --noCheck --emitDeclarationOnly invocation. Non-composite mode can resolve
 * circular imports between packages via source files, which is not possible in
 * composite/tsc -b mode due to rootDir constraints. The resulting .d.ts output in
 * target/types/ is then available for the main composite build via path mappings.
 */
export const bootstrapBundledTypes = async (
  log: ToolingLog,
  procRunner: ProcRunnerLike,
  bundledTypesProjects: TsProject[],
  pretty = true
): Promise<void> => {
  if (bundledTypesProjects.length === 0) {
    return;
  }

  log.info(
    `Bootstrapping bundled types for ${
      bundledTypesProjects.length
    } package(s): ${bundledTypesProjects.map((p) => p.name).join(', ')}`
  );

  for (const project of bundledTypesProjects) {
    const bootstrapConfigPath = Path.resolve(project.directory, 'tsconfig.bootstrap.json');
    const bootstrapConfig = {
      extends: '@kbn/tsconfig-base/tsconfig.json',
      compilerOptions: {
        outDir: 'target/types',
        rootDir: '.',
        declaration: true,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        noCheck: true,
        types: ['jest', 'node'],
      },
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['target/**/*', '**/*.test.*', '**/*.mock.*', '**/*.stories.*'],
    };

    await Fsp.writeFile(bootstrapConfigPath, JSON.stringify(bootstrapConfig, null, 2));

    try {
      await procRunner.run('tsc-bootstrap', {
        cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
        args: [
          '-p',
          Path.relative(REPO_ROOT, bootstrapConfigPath),
          ...(pretty ? ['--pretty'] : []),
        ],
        env: {
          NODE_OPTIONS: '--max-old-space-size=12288',
        },
        cwd: REPO_ROOT,
        wait: true,
      });
    } finally {
      await Fsp.unlink(bootstrapConfigPath).catch(() => {});
    }
  }
};

/**
 * Bootstrap circular consumers by building their .d.ts with a non-composite noCheck tsc.
 * These consumers depend on bundledTypes packages (resolved via bundled .d.ts) and are
 * themselves referenced by bundledTypes packages. Pre-building their .d.ts allows the
 * bundledTypes package to read them via paths instead of project references, avoiding
 * the diamond dependency problem.
 */
export const bootstrapCircularConsumers = async (
  log: ToolingLog,
  procRunner: ProcRunnerLike,
  consumers: TsProject[],
  allProjects: TsProject[],
  pretty = true,
  baseRootPaths?: Record<string, string[]>
): Promise<void> => {
  if (consumers.length === 0) return;

  const bundledTypesProjects = allProjects.filter((p) => p.hasBundledTypes());

  log.info(`Bootstrapping circular consumers: ${consumers.map((p) => p.name).join(', ')}`);

  for (const project of consumers) {
    const bootstrapConfigPath = Path.resolve(project.directory, 'tsconfig.bootstrap.json');

    // Build a paths override mapping bundledTypes packages to their bundled .d.ts
    const rootPaths: Record<string, string[]> = { ...(baseRootPaths ?? {}) };

    for (const bp of bundledTypesProjects) {
      const pkgName = bp.rootImportReq;
      if (pkgName) {
        rootPaths[pkgName] = [
          Path.relative(REPO_ROOT, Path.resolve(bp.directory, 'target/types/index.d.ts')),
        ];
        // Override wildcard subpath to resolve to compiled .d.ts instead of source
        rootPaths[`${pkgName}/*`] = [
          Path.relative(REPO_ROOT, Path.resolve(bp.directory, 'target/types/*')),
        ];
      }
    }

    const bootstrapConfig = {
      extends: '@kbn/tsconfig-base/tsconfig.json',
      compilerOptions: {
        baseUrl: REPO_ROOT,
        paths: rootPaths,
        outDir: 'target/types',
        rootDir: '.',
        declaration: true,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        noCheck: true,
        types: ['jest', 'node'],
      },
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['target/**/*', '**/*.test.*', '**/*.mock.*', '**/*.stories.*'],
    };

    await Fsp.writeFile(bootstrapConfigPath, JSON.stringify(bootstrapConfig, null, 2));

    try {
      await procRunner.run('tsc-bootstrap-consumer', {
        cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
        args: [
          '-p',
          Path.relative(REPO_ROOT, bootstrapConfigPath),
          ...(pretty ? ['--pretty'] : []),
        ],
        env: {
          NODE_OPTIONS: '--max-old-space-size=12288',
        },
        cwd: REPO_ROOT,
        wait: true,
      });
    } finally {
      await Fsp.unlink(bootstrapConfigPath).catch(() => {});
    }
  }
};

/** Detects uncommitted working-tree changes after a type-check run. */
export async function detectLocalChanges(): Promise<string[]> {
  const execa = (await import('execa')).default;
  const { stdout } = await execa(
    'git',
    // Some CI environments change these files dynamically, like FIPS but it shouldn't invalidate the cache
    ['status', '--porcelain', '--', '.', ':!:config/node.options', ':!config/kibana.yml'],
    {
      cwd: REPO_ROOT,
    }
  );

  return stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

/** Removes generated type-check outputs and the local type-check archive cache. */
export async function cleanTypeCheckCaches(log: ToolingLog, projects: TsProject[]) {
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
  log.warning('Deleted all TypeScript caches');
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

/**
 * Resolves the type-check scope from the validation contract, prepares the
 * generated configs, and runs `tsc -b` for the selected projects.
 */
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

      if (affectedProjectsContext.isRootProjectAffected) {
        log.info('Root TypeScript inputs changed; escalating to full type check of all projects.');
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

    // Resolve root paths once for all consumers of bundledTypes packages
    const rootTsconfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.json');
    const rootTsconfig = readTsConfig(rootTsconfigPath);
    const rootPaths = (rootTsconfig.compilerOptions?.paths as Record<string, string[]>) ?? {};

    // Bootstrap bundledTypes packages if their bundled .d.ts doesn't exist yet.
    // Consumers resolve these via path mappings, so the bundled output must be present.
    const needBootstrap = getBundledTypesProjectsNeedingBootstrap(TS_PROJECTS);
    if (needBootstrap.length > 0) {
      await bootstrapBundledTypes(log, procRunner, needBootstrap, pretty);
    }

    // Bootstrap circular consumers: their .d.ts must exist for bundledTypes packages
    // to resolve via paths (avoiding diamond dependency from project references).
    const circularConsumers = getCircularConsumersNeedingBootstrap(TS_PROJECTS);
    if (circularConsumers.length > 0) {
      await bootstrapCircularConsumers(
        log,
        procRunner,
        circularConsumers,
        TS_PROJECTS,
        pretty,
        rootPaths
      );
    }

    createdConfigs = await createTypeCheckConfigs(log, selectedProjects, TS_PROJECTS, rootPaths);

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
  } catch (_error) {
    // Error details are surfaced via captured ToolingLog output from procRunner
    tscFailed = true;
  }

  // Cleanup always runs, even if setup or tsc failed partway through
  try {
    // Archive artifacts (only after successful tsc)
    if (withArchive && !tscFailed) {
      const localChanges = await detectLocalChanges();
      const hasLocalChanges = localChanges.length > 0;
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
