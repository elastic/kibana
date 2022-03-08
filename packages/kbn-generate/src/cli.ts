/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import Ejs from 'ejs';
import globby from 'globby';
import { REPO_ROOT } from '@kbn/utils';
import {
  RunWithCommands,
  createFlagError,
  createFailError,
  isFailError,
  sortPackageJson,
} from '@kbn/dev-utils';
import { discoverPackages, generatePackagesBuildBazelFile } from '@kbn/packages';
import normalizePath from 'normalize-path';

const ROOT_PKG_DIR = Path.resolve(REPO_ROOT, 'packages');
const TEMPLATE_DIR = Path.resolve(__dirname, '../templates/package');

const jsonHelper = (arg: any) => JSON.stringify(arg, null, 2);
const jsHelper = (arg: string) => {
  if (typeof arg !== 'string') {
    throw new Error('js() only supports strings right now');
  }

  const hasSingle = arg.includes(`'`);
  const hasBacktick = arg.includes('`');

  if (!hasSingle) {
    return `'${arg}'`;
  }

  if (!hasBacktick) {
    return `\`${arg}\``;
  }

  return `'${arg.replaceAll(`'`, `\\'`)}'`;
};

export function runGenerateCli() {
  new RunWithCommands({
    description: 'Run generators for different components in Kibana',
  })
    .command({
      name: 'package',
      description: 'Generate a basic package',
      usage: 'node scripts/generate package [name]',
      flags: {
        boolean: ['web', 'force', 'dev'],
        string: ['dir'],
        help: `
          --dev          Generate a package which is intended for dev-only use and can access things like devDependencies
          --web          Build webpack-compatible version of sources for this package
          --dir          Directory where this package will live, defaults to [./packages]
          --force        If the packageDir already exists, delete it before generation
        `,
      },
      async run({ log, flags }) {
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

        const containingDir = flags.dir ? Path.resolve(`${flags.dir}`) : ROOT_PKG_DIR;
        const packageDir = Path.resolve(containingDir, name.slice(1).replace('/', '-'));
        const repoRelativeDir = normalizePath(Path.relative(REPO_ROOT, packageDir));

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

        const templateFiles = await globby('.', {
          cwd: TEMPLATE_DIR,
          absolute: false,
          dot: true,
          onlyFiles: true,
        });

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
          const src = Path.resolve(TEMPLATE_DIR, rel);
          const dest = Path.resolve(packageDir, ejs ? rel.slice(0, -4) : rel);

          if (!ejs) {
            await Fsp.copyFile(src, dest);
            log.debug('copied', rel);
            continue;
          }

          const vars = {
            pkg: {
              name,
              web,
              dev,
              directoryName: Path.basename(repoRelativeDir),
              repoRelativeDir,
            },

            // helpers
            json: jsonHelper,
            js: jsHelper,
            relativePathTo: (rootRelativePath: string) => {
              return Path.relative(Path.dirname(dest), Path.resolve(REPO_ROOT, rootRelativePath));
            },
          };

          log.verbose('rendering', src, 'with variables', vars);
          let content = await Ejs.renderFile(src, vars);

          if (Path.basename(dest) === 'package.json') {
            content = sortPackageJson(content);
          }

          await Fsp.writeFile(dest, content);
          log.debug('rendered', rel);
        }

        log.info('Wrote plugin files to', packageDir);

        const packageJsonPath = Path.resolve(REPO_ROOT, 'package.json');
        const packageJson = JSON.parse(await Fsp.readFile(packageJsonPath, 'utf8'));

        const [addDeps, removeDeps] = dev
          ? [packageJson.devDependencies, packageJson.dependencies]
          : [packageJson.dependencies, packageJson.devDependencies];

        addDeps[name] = `link:bazel-bin/${repoRelativeDir}`;
        addDeps[typePkgName] = `link:bazel-bin/${repoRelativeDir}/npm_module_types`;
        delete removeDeps[name];
        delete removeDeps[typePkgName];

        await Fsp.writeFile(packageJsonPath, sortPackageJson(JSON.stringify(packageJson)));
        log.info('Updated package.json file');

        await Fsp.writeFile(
          Path.resolve(REPO_ROOT, 'packages/BUILD.bazel'),
          generatePackagesBuildBazelFile(await discoverPackages())
        );
        log.info('Updated packages/BUILD.bazel');

        log.success(`Generated ${name}! Please bootstrap to make sure it works.`);
      },
    })
    .execute();
}
