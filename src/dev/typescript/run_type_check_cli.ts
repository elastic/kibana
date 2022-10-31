/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Fsp from 'fs/promises';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/utils';
import { Jsonc } from '@kbn/bazel-packages';
import { runBazel } from '@kbn/bazel-runner';
import { asyncForEachWithLimit } from '@kbn/std';
import { BazelPackage, discoverBazelPackages } from '@kbn/bazel-packages';

import { PROJECTS } from './projects';
import { Project } from './project';
import {
  updateRootRefsConfig,
  cleanupRootRefsConfig,
  ROOT_REFS_CONFIG_PATH,
} from './root_refs_config';

function rel(from: string, to: string) {
  const relative = Path.relative(from, to);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function isValidRefs(refs: unknown): refs is Array<{ path: string }> {
  return (
    Array.isArray(refs) &&
    refs.every(
      (r) => typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string'
    )
  );
}

function parseTsconfig(path: string) {
  const jsonc = Fs.readFileSync(path, 'utf8');
  const parsed = Jsonc.parse(jsonc) as Record<string, any>;
  if (typeof parsed !== 'object' || parsed === null) {
    throw createFailError(`expected JSON at ${path} to parse into an object`);
  }

  return parsed;
}

function toTypeCheckConfigPath(path: string) {
  return path.endsWith('tsconfig.base.json')
    ? path.replace(/\/tsconfig\.base\.json$/, '/tsconfig.base.type_check.json')
    : path.replace(/\/tsconfig\.json$/, '/tsconfig.type_check.json');
}

function createTypeCheckConfigs(projects: Project[], bazelPackages: BazelPackage[]) {
  const created = new Set<string>();
  const bazelPackageIds = new Set(bazelPackages.map((p) => p.manifest.id));

  // write root tsconfig.type_check.json
  const baseTypeCheckConfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.type_check.json');
  const baseConfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.json');
  const baseStat = Fs.statSync(baseConfigPath);
  const basePaths = parseTsconfig(baseConfigPath).compilerOptions.paths;
  if (typeof basePaths !== 'object' || basePaths === null) {
    throw createFailError(`expected root compilerOptions.paths to be an object`);
  }
  Fs.writeFileSync(
    baseTypeCheckConfigPath,
    JSON.stringify(
      {
        extends: './tsconfig.base.json',
        compilerOptions: {
          paths: Object.fromEntries(
            Object.entries(basePaths).flatMap(([key, value]) => {
              if (key.endsWith('/*') && bazelPackageIds.has(key.slice(0, -2))) {
                return [];
              }

              if (bazelPackageIds.has(key)) {
                return [];
              }

              return [[key, value]];
            })
          ),
        },
      },
      null,
      2
    )
  );
  Fs.utimesSync(baseTypeCheckConfigPath, baseStat.atime, baseStat.mtime);
  created.add(baseTypeCheckConfigPath);

  // write tsconfig.type_check.json files for each project that is not the root
  const queue = new Set(projects.map((p) => p.tsConfigPath));
  for (const path of queue) {
    const tsconfigStat = Fs.statSync(path);
    const parsed = parseTsconfig(path);

    const dir = Path.dirname(path);
    const typeCheckConfigPath = Path.resolve(dir, 'tsconfig.type_check.json');
    const refs = parsed.kbn_references ?? [];
    if (!isValidRefs(refs)) {
      throw new Error(`expected valid TS refs in ${path}`);
    }

    const typeCheckConfig = {
      ...parsed,
      extends: parsed.extends
        ? toTypeCheckConfigPath(parsed.extends)
        : rel(dir, baseTypeCheckConfigPath),
      compilerOptions: {
        ...parsed.compilerOptions,
        composite: true,
        incremental: true,
        rootDir: '.',
        paths: undefined,
      },
      kbn_references: undefined,
      references: refs.map((ref) => ({
        path: toTypeCheckConfigPath(ref.path),
      })),
    };

    Fs.writeFileSync(typeCheckConfigPath, JSON.stringify(typeCheckConfig, null, 2));
    Fs.utimesSync(typeCheckConfigPath, tsconfigStat.atime, tsconfigStat.mtime);

    created.add(typeCheckConfigPath);

    // add all the referenced config files to the queue if they're not already in it
    for (const ref of refs) {
      queue.add(Path.resolve(dir, ref.path));
    }
  }

  return created;
}

export async function runTypeCheckCli() {
  run(
    async ({ log, flagsReader, procRunner }) => {
      if (flagsReader.boolean('clean-cache')) {
        await asyncForEachWithLimit(PROJECTS, 10, async (proj) => {
          await Fsp.rm(Path.resolve(proj.directory, 'target/types'), {
            force: true,
            recursive: true,
          });
        });
        log.warning('Deleted all typescript caches');
      }

      log.warning(
        `Building types for all bazel packages. This can take a while depending on your changes and won't show any progress while it runs.`
      );
      await runBazel(['build', '//packages:build_types', '--show_result=1'], {
        cwd: REPO_ROOT,
        logPrefix: '\x1b[94m[bazel]\x1b[39m',
        onErrorExit(code: any, output: any) {
          throw createFailError(
            `The bazel command that was running exited with code [${code}] and output: ${output}`
          );
        },
      });

      const bazelPackages = await discoverBazelPackages(REPO_ROOT);

      // if the tsconfig.refs.json file is not self-managed then make sure it has
      // a reference to every composite project in the repo
      await updateRootRefsConfig(log, bazelPackages);

      const projectFilter = flagsReader.path('project');

      const projects = PROJECTS.filter((p) => {
        return !p.disableTypeCheck && (!projectFilter || p.tsConfigPath === projectFilter);
      });

      const created = createTypeCheckConfigs(projects, bazelPackages);

      let pluginBuildResult;
      try {
        log.info(`Building TypeScript projects to check types...`);

        const relative = Path.relative(
          REPO_ROOT,
          projects.length === 1 ? projects[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
        );

        await procRunner.run('tsc', {
          cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
          args: [
            '-b',
            relative,
            '--pretty',
            ...(flagsReader.boolean('verbose') ? ['--verbose'] : []),
          ],
          cwd: REPO_ROOT,
          wait: true,
        });

        pluginBuildResult = { failed: false };
      } catch (error) {
        pluginBuildResult = { failed: true };
      }

      // cleanup
      if (flagsReader.boolean('cleanup')) {
        await cleanupRootRefsConfig();

        await asyncForEachWithLimit(created, 40, async (path) => {
          await Fsp.unlink(path);
        });

        await asyncForEachWithLimit(bazelPackages, 40, async (pkg) => {
          const targetTypesPaths = Path.resolve(
            REPO_ROOT,
            'bazel-bin',
            pkg.normalizedRepoRelativeDir,
            'target_type'
          );

          await Fsp.rm(targetTypesPaths, {
            force: true,
            recursive: true,
          });
        });
      }

      if (pluginBuildResult.failed) {
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
        boolean: ['clean-cache', 'cleanup'],
        default: {
          cleanup: true,
        },
        help: `
          --project [path]        Path to a tsconfig.json file determines the project to check
          --help                  Show this message
          --clean-cache           Delete any existing TypeScript caches before running type check
          --no-cleanup            Pass to avoid deleting the temporary tsconfig files written to disk
        `,
      },
    }
  );
}
