/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import normalizePath from 'normalize-path';
import globby from 'globby';
import { ESLint } from 'eslint';

import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError, createFlagError, isFailError } from '@kbn/dev-cli-errors';
import { sortPackageJson } from '@kbn/sort-package-json';

import { validateElasticTeam } from '../lib/validate_elastic_team';
import { ROOT_PKG_DIR, PKG_TEMPLATE_DIR } from '../paths';
import type { GenerateCommand } from '../generate_command';
import { ask } from '../lib/ask';

const validPkgId = (id: unknown): id is string =>
  typeof id === 'string' && id.startsWith('@kbn/') && !id.includes(' ');

export const PackageCommand: GenerateCommand = {
  name: 'package',
  description: 'Generate a basic package',
  usage: 'node scripts/generate package [pkgId]',
  flags: {
    boolean: ['web', 'force', 'dev'],
    string: ['dir', 'owner'],
    help: `
      --dev          Generate a package which is intended for dev-only use and can access things like devDependencies
      --web          Build webpack-compatible version of sources for this package. If your package is intended to be
                      used in the browser and Node.js then you need to opt-into these sources being created.
      --dir          Specify where this package will be written.
                      defaults to [./packages/{kebab-case-version-of-name}]
      --force        If the --dir already exists, delete it before generation
      --owner        Github username of the owner for this package, if this is not specified then you will be asked for
                      this value interactively.
    `,
  },
  async run({ log, flags, render }) {
    const pkgId =
      flags._[0] ||
      (await ask({
        question: `What should the package id be? (Must start with @kbn/ and have no spaces)`,
        async validate(input) {
          if (validPkgId(input)) {
            return input;
          }

          return {
            err: `"${input}" must start with @kbn/ and have no spaces`,
          };
        },
      }));

    if (!validPkgId(pkgId)) {
      throw createFlagError(`package id must start with @kbn/ and have no spaces`);
    }

    const web = !!flags.web;
    const dev = !!flags.dev;

    const packageDir = flags.dir
      ? Path.resolve(`${flags.dir}`)
      : Path.resolve(ROOT_PKG_DIR, pkgId.slice(1).replace('/', '-'));
    const normalizedRepoRelativeDir = normalizePath(Path.relative(REPO_ROOT, packageDir));

    try {
      await Fsp.readdir(packageDir);
      if (!!flags.force) {
        await Fsp.rm(packageDir, { recursive: true });
        log.warning('deleted existing package at', packageDir);
      } else {
        throw createFailError(
          `Package dir [${packageDir}] already exists, either choose a new package name, or pass --force to delete the package and regenerate it`
        );
      }
    } catch (error) {
      if (isFailError(error)) {
        throw error;
      }
    }

    const owner =
      flags.owner ||
      (await ask({
        question: 'Which Elastic team should own this package? (Must start with "@elastic/")',
        async validate(input) {
          try {
            return await validateElasticTeam(input);
          } catch (error) {
            log.error(`failed to validate team: ${error.message}`);
            return input;
          }
        },
      }));
    if (typeof owner !== 'string' || !owner.startsWith('@')) {
      throw createFlagError(`expected --owner to be a string starting with an @ symbol`);
    }

    const templateFiles = await globby('**/*', {
      cwd: PKG_TEMPLATE_DIR,
      absolute: false,
      dot: true,
      onlyFiles: true,
    });
    if (!templateFiles.length) {
      throw new Error('unable to find package template files');
    }

    await Fsp.mkdir(packageDir, { recursive: true });

    for (const rel of templateFiles) {
      const destDir = Path.resolve(packageDir, Path.dirname(rel));

      await Fsp.mkdir(destDir, { recursive: true });

      if (Path.basename(rel) === '.empty') {
        log.debug('created dir', destDir);
        // ignore .empty files in the template, just create the directory
        continue;
      }

      const ejs = !!rel.endsWith('.ejs');
      const src = Path.resolve(PKG_TEMPLATE_DIR, rel);
      const dest = Path.resolve(packageDir, ejs ? rel.slice(0, -4) : rel);

      if (!ejs) {
        // read+write rather than `Fsp.copyFile` so that permissions of bazel-out are not copied to target
        await Fsp.writeFile(dest, await Fsp.readFile(src));
        log.debug('copied', rel);
        continue;
      }

      await render.toFile(src, dest, {
        pkg: {
          id: pkgId,
          web,
          dev,
          owner,
          directoryName: Path.basename(normalizedRepoRelativeDir),
          normalizedRepoRelativeDir,
        },
      });
    }

    log.info('Wrote plugin files to', packageDir);

    log.info('Linting files');
    const eslint = new ESLint({
      cache: false,
      cwd: REPO_ROOT,
      fix: true,
      extensions: ['.js', '.mjs', '.ts', '.tsx'],
    });
    await ESLint.outputFixes(await eslint.lintFiles([packageDir]));

    const packageJsonPath = Path.resolve(REPO_ROOT, 'package.json');
    const packageJson = JSON.parse(await Fsp.readFile(packageJsonPath, 'utf8'));

    const [addDeps, removeDeps] = dev
      ? [packageJson.devDependencies, packageJson.dependencies]
      : [packageJson.dependencies, packageJson.devDependencies];

    addDeps[pkgId] = `link:${normalizedRepoRelativeDir}`;
    delete removeDeps[pkgId];

    await Fsp.writeFile(packageJsonPath, sortPackageJson(packageJson));
    log.info('Updated package.json file');

    log.success(`Generated ${pkgId}! Please bootstrap to make sure it works.`);
  },
};
