/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import normalizePath from 'normalize-path';
import globby from 'globby';
import { ESLint } from 'eslint';

import micromatch from 'micromatch';
import { REPO_ROOT } from '@kbn/utils';
import { discoverBazelPackages, BAZEL_PACKAGE_DIRS } from '@kbn/bazel-packages';
import { createFailError, createFlagError, isFailError } from '@kbn/dev-utils';
import { sortPackageJson } from '@kbn/sort-package-json';

import { TEMPLATE_DIR, ROOT_PKG_DIR, PKG_TEMPLATE_DIR } from '../paths';
import type { GenerateCommand } from '../generate_command';

export const PackageCommand: GenerateCommand = {
  name: 'package',
  description: 'Generate a basic package',
  usage: 'node scripts/generate package [name]',
  flags: {
    boolean: ['web', 'force', 'dev'],
    string: ['dir'],
    help: `
      --dev          Generate a package which is intended for dev-only use and can access things like devDependencies
      --web          Build webpack-compatible version of sources for this package. If your package is intended to be
                      used in the browser and Node.js then you need to opt-into these sources being created.
      --dir          Specify where this package will be written. The path must be a direct child of one of the
                      directories selected by the BAZEL_PACKAGE_DIRS const in @kbn/bazel-packages.
                        Valid locations for packages:
${BAZEL_PACKAGE_DIRS.map((dir) => `                          ./${dir}/*\n`).join('')}
                      defaults to [./packages/{kebab-case-version-of-name}]
      --force        If the --dir already exists, delete it before generation
    `,
  },
  async run({ log, flags, render }) {
    const [name] = flags._;
    if (!name) {
      throw createFlagError(`missing package name`);
    }
    if (!name.startsWith('@kbn/')) {
      throw createFlagError(`package name must start with @kbn/`);
    }

    const typePkgName = `@types/${name.slice(1).replace('/', '__')}`;
    const web = !!flags.web;
    const dev = !!flags.dev;

    const packageDir = flags.dir
      ? Path.resolve(`${flags.dir}`)
      : Path.resolve(ROOT_PKG_DIR, name.slice(1).replace('/', '-'));
    const relContainingDir = Path.relative(REPO_ROOT, Path.dirname(packageDir));
    if (!micromatch.isMatch(relContainingDir, BAZEL_PACKAGE_DIRS)) {
      throw createFlagError(
        'Invalid --dir selection. To setup a new --dir option extend the `BAZEL_PACKAGE_DIRS` const in `@kbn/bazel-packages` and make sure to rebuild.'
      );
    }

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
          name,
          web,
          dev,
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

    addDeps[name] = `link:bazel-bin/${normalizedRepoRelativeDir}`;
    delete removeDeps[name];

    // for @types packages always remove from deps and add to devDeps
    packageJson.devDependencies[
      typePkgName
    ] = `link:bazel-bin/${normalizedRepoRelativeDir}/npm_module_types`;
    delete packageJson.dependencies[typePkgName];

    await Fsp.writeFile(packageJsonPath, sortPackageJson(JSON.stringify(packageJson)));
    log.info('Updated package.json file');

    await render.toFile(
      Path.resolve(TEMPLATE_DIR, 'packages_BUILD.bazel.ejs'),
      Path.resolve(REPO_ROOT, 'packages/BUILD.bazel'),
      {
        packages: await discoverBazelPackages(),
      }
    );
    log.info('Updated packages/BUILD.bazel');

    log.success(`Generated ${name}! Please bootstrap to make sure it works.`);
  },
};
