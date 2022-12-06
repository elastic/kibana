/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { diffStrings } from '@kbn/dev-utils';
import { run } from '@kbn/dev-cli-runner';
import { asyncMapWithLimit } from '@kbn/std';
import { createFailError } from '@kbn/dev-cli-errors';
import { getRepoFiles } from '@kbn/get-repo-files';
import { REPO_ROOT } from '@kbn/repo-info';
import { readPackageMap } from '@kbn/package-map';
import globby from 'globby';

import { File } from '../file';
import { PROJECTS } from './projects';
import type { Project } from './project';

class Stats {
  counts = {
    files: new Map<Project, number>(),
    ignored: new Map<Project, number>(),
    gitMatched: new Map<Project, number>(),
  };

  incr(proj: Project, metric: 'files' | 'ignored' | 'gitMatched', delta = 1) {
    const cur = this.counts[metric].get(proj);
    this.counts[metric].set(proj, (cur ?? 0) + delta);
  }
}

export async function runCheckTsProjectsCli() {
  run(
    async ({ log, flagsReader }) => {
      const fix = flagsReader.boolean('fix');
      const stats = new Stats();
      const pkgMap = readPackageMap();
      const pkgDirMap = new Map(Array.from(pkgMap).map(([k, v]) => [v || '.', k]));

      const warnedNonPkgRef = new Set<string>();
      function getPkgIdJson(tsconfigPath: string) {
        const repoRelRef = Path.relative(REPO_ROOT, Path.dirname(tsconfigPath)) || '.';
        const pkgId = pkgDirMap.get(repoRelRef);
        if (pkgId) {
          return JSON.stringify(pkgId);
        }

        if (!warnedNonPkgRef.has(repoRelRef)) {
          warnedNonPkgRef.add(repoRelRef);
          log.warning(`unable to map ${repoRelRef} to a package id`);
        }
      }

      let failed = false;

      const everyProjectDeep = new Set(PROJECTS.flatMap((p) => p.getProjectsDeep()));
      for (const proj of everyProjectDeep) {
        const [, ...baseConfigRels] = proj.getConfigPaths().map((p) => Path.relative(REPO_ROOT, p));
        const configRel = Path.relative(REPO_ROOT, proj.tsConfigPath);

        if (baseConfigRels[0] === 'tsconfig.json') {
          failed = true;
          log.error(
            `[${configRel}]: This tsconfig extends the root tsconfig.json file and shouldn't. The root tsconfig.json file is not a valid base config, you probably want to point to the tsconfig.base.json file.`
          );
        }
        if (configRel !== 'tsconfig.base.json' && !baseConfigRels.includes('tsconfig.base.json')) {
          failed = true;
          log.error(
            `[${configRel}]: This tsconfig does not extend the tsconfig.base.json file either directly or indirectly. The TS config setup for the repo expects every tsconfig file to extend this base config file.`
          );
        }

        const jsonc = Fs.readFileSync(proj.tsConfigPath, 'utf8');
        const withReplacements = jsonc.replaceAll(
          /{[^\"]*"path":\s*("[^"]+"),?[^\}]*}/g,
          (match, jsonPath) => {
            const refPath = Path.resolve(proj.directory, JSON.parse(jsonPath));
            return getPkgIdJson(refPath) ?? match;
          }
        );

        if (jsonc !== withReplacements) {
          if (fix) {
            Fs.writeFileSync(proj.tsConfigPath, withReplacements);
          } else {
            failed = true;
            log.error(
              `[${configRel}]: kbn_references must use pkgIds to refer to other packages (use --fix to autofix)\n\n${diffStrings(
                jsonc,
                withReplacements
              )}\n`
            );
          }
        }
      }

      const pathsAndProjects = await asyncMapWithLimit(PROJECTS, 5, async (proj) => {
        const paths = await globby(proj.getIncludePatterns(), {
          ignore: proj.getExcludePatterns(),
          cwd: proj.directory,
          onlyFiles: true,
          absolute: true,
        });
        stats.incr(proj, 'files', paths.length);
        return {
          proj,
          paths,
        };
      });

      const isInMultipleTsProjects = new Map<string, Set<Project>>();
      const pathsToProject = new Map<string, Project>();
      for (const { proj, paths } of pathsAndProjects) {
        for (const path of paths) {
          if (!pathsToProject.has(path)) {
            pathsToProject.set(path, proj);
            continue;
          }

          if (path.endsWith('.d.ts')) {
            stats.incr(proj, 'ignored');
            continue;
          }

          isInMultipleTsProjects.set(
            path,
            new Set([...(isInMultipleTsProjects.get(path) ?? []), proj])
          );
        }
      }

      if (isInMultipleTsProjects.size) {
        failed = true;
        const details = Array.from(isInMultipleTsProjects)
          .map(
            ([path, projects]) =>
              ` - ${Path.relative(process.cwd(), path)}:\n${Array.from(projects)
                .map((p) => `   - ${Path.relative(process.cwd(), p.tsConfigPath)}`)
                .join('\n')}`
          )
          .join('\n');

        log.error(
          `The following files belong to multiple tsconfig.json files listed in src/dev/typescript/projects.ts\n${details}`
        );
      }

      const isNotInTsProject: File[] = [];
      for (const { abs } of await getRepoFiles()) {
        const file = new File(abs);
        if (!file.isTypescript() || file.isFixture()) {
          continue;
        }

        const proj = pathsToProject.get(file.getAbsolutePath());
        if (proj === undefined) {
          isNotInTsProject.push(file);
        } else {
          stats.incr(proj, 'gitMatched');
        }
      }

      if (isNotInTsProject.length) {
        failed = true;
        log.error(
          `The following files do not belong to a tsconfig.json file, or that tsconfig.json file is not listed in src/dev/typescript/projects.ts\n${isNotInTsProject
            .map((file) => ` - ${file.getRelativePath()}`)
            .join('\n')}`
        );
      }

      for (const [metric, counts] of Object.entries(stats.counts)) {
        log.verbose('metric:', metric);
        for (const [proj, count] of Array.from(counts).sort((a, b) =>
          a[0].name.localeCompare(b[0].name)
        )) {
          log.verbose('  ', proj.name, count);
        }
      }

      if (failed) {
        throw createFailError('see above errors');
      } else {
        log.success('All ts files belong to a single ts project');
      }
    },
    {
      flags: {
        boolean: ['fix'],
        alias: { f: 'fix' },
        help: `
          --fix              Automatically fix some issues in tsconfig.json files
        `,
      },
      description:
        'Check that all .ts and .tsx files in the repository are assigned to a tsconfig.json file',
    }
  );
}
