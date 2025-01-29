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
import { getRepoFiles } from '@kbn/get-repo-files';
import { PackageFileMap } from '@kbn/repo-file-maps';
import { updatePackageMap, getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { TS_PROJECTS } from '@kbn/ts-projects';
import { makeMatcher } from '@kbn/picomatcher';
import { runLintRules, PackageLintTarget } from '@kbn/repo-linter';

import { RULES } from './rules';
import { migratePluginsToPackages } from './migrate_plugins_to_package';

const legacyManifestMatcher = makeMatcher(['**/kibana.json', '!**/{__fixtures__,fixtures}/**']);

const kebabCase = (input: string) =>
  input
    .replace(/([a-z])([A-Z])/, '$1 $2')
    .split(/\W+/)
    .filter((f) => !!f)
    .join('-')
    .toLowerCase();

function getFilter(input: string) {
  const repoRel = Path.relative(REPO_ROOT, Path.resolve(input));
  return ({ pkg }: PackageLintTarget) =>
    pkg.name === input ||
    pkg.name === `@kbn/${input}` ||
    pkg.name === `@kbn/${kebabCase(input)}` ||
    pkg.normalizedRepoRelativeDir === input ||
    repoRel.startsWith(pkg.normalizedRepoRelativeDir + '/');
}

run(
  async ({ log, flagsReader }) => {
    const filter = flagsReader.getPositionals();
    let allRepoFiles = await getRepoFiles();

    const legacyPackageManifests = Array.from(allRepoFiles).filter((f) =>
      legacyManifestMatcher(f.repoRel)
    );

    if (legacyPackageManifests.length) {
      await migratePluginsToPackages(legacyPackageManifests);
      log.warning('Migrated legacy plugins to packages');
      allRepoFiles = await getRepoFiles();
    }

    const pkgManifestPaths = Array.from(allRepoFiles)
      .filter((f) => f.basename === 'kibana.jsonc')
      .map((f) => f.abs);
    if (await updatePackageMap(REPO_ROOT, pkgManifestPaths)) {
      log.warning('updated package map');
    }
    const packages = getPackages(REPO_ROOT);

    const allTargets = packages
      .map(
        (p) =>
          new PackageLintTarget(
            p,
            TS_PROJECTS.find((ts) => ts.repoRelDir === p.normalizedRepoRelativeDir)
          )
      )
      .sort((a, b) => b.repoRel.length - a.repoRel.length);

    const toLint = Array.from(
      new Set(
        !filter.length
          ? allTargets
          : filter.map((input) => {
              const pkg = allTargets.find(getFilter(input));

              if (!pkg) {
                throw createFailError(
                  `unable to find a package matching [${input}]. Supply either a package id/name or path to a package`
                );
              }

              return pkg;
            })
      )
    ).sort((a, b) => a.repoRel.localeCompare(b.repoRel));

    const fileMap = new PackageFileMap(packages, allRepoFiles);
    const { lintingErrorCount } = await runLintRules(log, toLint, RULES, {
      fix: flagsReader.boolean('fix'),
      getFiles: (target) => fileMap.getFiles(target.pkg),
    });

    if (!lintingErrorCount) {
      log.success('All packages linted successfully');
    } else {
      throw createFailError('see above errors');
    }
  },
  {
    usage: `node scripts/lint_packages [...packages]`,
    flags: {
      boolean: ['fix'],
      alias: { f: 'fix' },
      help: `
        --fix              Automatically fix some issues in tsconfig.json files
      `,
    },
    description: 'Validate packages using a set of rules that evolve over time.',
  }
);
