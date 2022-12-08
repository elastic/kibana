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
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import { Jsonc } from '@kbn/bazel-packages';
import { readPackageMap } from '@kbn/package-map';

import { PROJECTS } from './projects';
import { Project } from './project';
import {
  updateRootRefsConfig,
  cleanupRootRefsConfig,
  ROOT_REFS_CONFIG_PATH,
} from './root_refs_config';

type KbnRef = string | { path: string };

function isValidKbnRefs(refs: unknown): refs is KbnRef[] {
  return (
    Array.isArray(refs) &&
    refs.every(
      (r) =>
        typeof r === 'string' ||
        (typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string')
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
    ? path
    : path.replace(/\/tsconfig\.json$/, '/tsconfig.type_check.json');
}

async function createTypeCheckConfigs(projects: Project[]) {
  const pkgMap = readPackageMap();
  const writes: Array<{ path: string; content: string; atime: number; mtime: number }> = [];

  // write tsconfig.type_check.json files for each project that is not the root
  const queue = new Set(projects.map((p) => p.tsConfigPath));
  for (const path of queue) {
    const parsed = parseTsconfig(path);

    const dir = Path.dirname(path);
    const refs = parsed.kbn_references ?? [];
    if (!isValidKbnRefs(refs)) {
      throw new Error(`expected valid TS refs in ${path}`);
    }

    const typeCheckConfig = {
      ...parsed,
      extends: parsed.extends ? toTypeCheckConfigPath(parsed.extends) : undefined,
      compilerOptions: {
        ...parsed.compilerOptions,
        composite: true,
        rootDir: '.',
        paths: undefined,
      },
      kbn_references: undefined,
      references: refs.map((ref) => {
        if (typeof ref !== 'string') {
          // add the referenced config file to the queue if it's not already in it
          queue.add(Path.resolve(dir, ref.path));
          return { path: toTypeCheckConfigPath(ref.path) };
        }

        const relPkgDir = pkgMap.get(ref);
        if (!relPkgDir) {
          throw createFailError(
            `tsconfig in ${dir} includes "kbn_reference" for [${ref}] but that is not a know package`
          );
        }

        const pkgDir = Path.resolve(REPO_ROOT, relPkgDir);
        // add the referenced config file to the queue if it's not already in it
        queue.add(Path.resolve(pkgDir, 'tsconfig.json'));
        return {
          path: Path.relative(dir, Path.resolve(pkgDir, 'tsconfig.type_check.json')),
        };
      }),
    };

    const tsconfigStat = await Fsp.stat(path);
    writes.push({
      path: Path.resolve(dir, 'tsconfig.type_check.json'),
      atime: tsconfigStat.atimeMs,
      mtime: tsconfigStat.mtimeMs,
      content: JSON.stringify(typeCheckConfig, null, 2),
    });
  }

  return new Set<string>(
    await asyncMapWithLimit(writes, 50, async ({ content, path, atime, mtime }) => {
      await Fsp.writeFile(path, content, 'utf8');
      await Fsp.utimes(path, atime, mtime);
      return path;
    })
  );
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

      // if the tsconfig.refs.json file is not self-managed then make sure it has
      // a reference to every composite project in the repo
      await updateRootRefsConfig(log);

      const projectFilter = flagsReader.path('project');

      const projects = PROJECTS.filter(
        (p) => !p.disableTypeCheck && (!projectFilter || p.tsConfigPath === projectFilter)
      );

      const created = await createTypeCheckConfigs(projects);

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
        help: `
          --project [path]        Path to a tsconfig.json file determines the project to check
          --help                  Show this message
          --clean-cache           Delete any existing TypeScript caches before running type check
          --cleanup               Pass to avoid leving temporary tsconfig files on disk. Leaving these
                                    files in place makes subsequent executions faster because ts can
                                    identify that none of the imports have changed (it uses creation/update
                                    times) but cleaning them prevents leaving garbage around the repo.
        `,
      },
    }
  );
}
