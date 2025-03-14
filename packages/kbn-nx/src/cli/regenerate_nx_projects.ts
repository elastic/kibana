/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { getPackages, Package } from '@kbn/repo-packages';
import { ToolingLog } from '@kbn/tooling-log';

import projectTemplate from './project.template.json';

function generateProjectConfig(template: string, pkg: Package) {
  const projectConfig = JSON.parse(template);
  projectConfig.name = pkg.name;
  projectConfig.projectType = pkg.isPlugin() ? 'application' : 'library';
  projectConfig.sourceRoot = pkg.normalizedRepoRelativeDir;
  projectConfig.namedInputs = projectConfig.namedInputs || {};

  return projectConfig;
}

function updateFieldsFromTsConfig(
  projectConfig: any,
  params: {
    tsConfigPath: string;
    implicitDependencies: boolean;
    log: ToolingLog;
  }
) {
  const { log, tsConfigPath, implicitDependencies } = params;
  log.verbose(`Reading tsconfig from ${tsConfigPath}`);

  // this is how we can read a JSON file that may contain comments
  // eslint-disable-next-line no-eval
  const tsConfig = eval('0,' + fs.readFileSync(tsConfigPath, 'utf8'));

  const tsInclude = (tsConfig.include || []).map((e: string) => `{projectRoot}/${e}`);
  const tsExclude = (tsConfig.exclude || []).map((e: string) => `!{projectRoot}/${e}`);
  const src = tsInclude
    .concat(tsExclude)
    .map((e: string) => e.replace(/.*typings/, '{workspaceRoot}/typings'));

  const dependencies = tsConfig.kbn_references;
  if (implicitDependencies && dependencies) {
    // TODO: some dependencies are referenced as objects
    projectConfig.implicitDependencies = dependencies.filter((e: any) => typeof e === 'string');
  }

  projectConfig.namedInputs.src = src;
}

async function updateProjectJestConfig(projectConfig: any, params: { log: ToolingLog }) {
  const { log } = params;

  const jestConfigName = findAny(projectConfig.sourceRoot, [
    'jest.config.js',
    'jest.config.cjs',
    'jest.config.json',
  ]);

  if (!jestConfigName) {
    log.warning(
      `Could not find jest config for ${projectConfig.name} @ ${projectConfig.sourceRoot}`
    );
    delete projectConfig.targets.jest;
  } else {
    projectConfig.targets.jest = {
      options: {
        jestConfig: `{projectRoot}/${jestConfigName}`,
      },
    };
  }
}

async function updateProjectLintConfig(
  projectConfig: any,
  params: { log: ToolingLog; eslintIgnore: string }
) {
  const { log, eslintIgnore } = params;
  if (eslintIgnore.split('\n').includes('/' + projectConfig.sourceRoot)) {
    log.info(
      `Skipping lint target for project ${projectConfig.name}. It's explicitly ignored in .eslintignore`
    );
    delete projectConfig.targets.lint;
    return;
  }

  const eslintConfigName = findAny(projectConfig.sourceRoot, ['.eslintrc.js', '.eslintrc.json']);

  if (eslintConfigName) {
    projectConfig.targets.lint = {
      // options: {
      //   eslintConfig: `{projectRoot}/${eslintConfigName}`,
      // },
    };
  } else {
    // go with the default, which is {workspaceRoot}/.eslintrc.js
  }
}

export function regenerateNxProjects() {
  return run(
    async ({ log, flags }) => {
      const filter: string | string[] | undefined =
        (flags.filter as string | string[]) || undefined;
      const update = flags.update as boolean | undefined;
      const dryRun = flags['dry-run'] as boolean | undefined;
      const implicitDependencies = !!flags['implicit-dependencies'];

      const template = JSON.stringify(projectTemplate, null, 2);
      const allPackages: Package[] = getPackages(REPO_ROOT);

      const filteredPackages = filter ? filterPackages(allPackages, filter) : allPackages;

      const projectsCreated = [];
      const projectsUpdated = [];

      const eslintIgnore = fs.readFileSync(path.resolve(REPO_ROOT, '.eslintignore'), 'utf8');

      for (const pkg of filteredPackages) {
        log.verbose(`Generating project configuration for ${pkg.name}`);
        const projectConfig = generateProjectConfig(template, pkg);

        const tsConfigPath = path.resolve(pkg.normalizedRepoRelativeDir, 'tsconfig.json');
        if (fs.existsSync(tsConfigPath)) {
          updateFieldsFromTsConfig(projectConfig, {
            tsConfigPath,
            implicitDependencies,
            log,
          });
        } else {
          delete projectConfig.targets.typecheck;
          log.warning(`Skipping ${pkg.name} - no tsconfig.json found.`);
        }

        await updateProjectJestConfig(projectConfig, {
          log,
        });

        await updateProjectLintConfig(projectConfig, {
          eslintIgnore,
          log,
        });

        const targetPath = path.resolve(pkg.normalizedRepoRelativeDir, 'project.json');
        const result = createOrUpdateConfig(targetPath, projectConfig, { update, dryRun, log });
        switch (result) {
          case 'create':
            projectsCreated.push(pkg.name);
            break;
          case 'update':
            projectsUpdated.push(pkg.name);
            break;
          case 'skip':
            break;
        }
      }

      log.success(
        `🎉 NX project configuration successful: \n${projectsCreated.length} created, ${projectsUpdated.length} updated.`
      );
    },
    {
      usage: `node ${path.relative(REPO_ROOT, process.argv[1])}`,
      description: `
        Generates NX project configuration for a package/plugin from available hints around the package/plugin.
      `,
      flags: {
        string: ['filter'],
        boolean: ['dry-run', 'update', 'implicit-dependencies'],
        default: {},
        alias: {},
        help: `
          --filter                    Filter packages by name or directory
          --update                    Update existing project configuration(s)
          --no-implicit-dependencies  Do not include implicitDependencies section in the project configuration
          --dry-run                   Do not write to disk
        `,
      },
    }
  );
}

function createOrUpdateConfig(
  targetPath: string,
  projectConfig: any,
  {
    update,
    dryRun,
    log,
  }: { update: boolean | undefined; dryRun: boolean | undefined; log: ToolingLog }
): 'create' | 'update' | 'skip' {
  const name = projectConfig.name;
  const projectExists = fs.existsSync(targetPath);
  if (projectExists) {
    if (update && !fs.readFileSync(targetPath).includes('_preventUpdate')) {
      if (dryRun) {
        log.info(`Would update ${name} project configuration.`);
      } else {
        fs.writeFileSync(targetPath, JSON.stringify(projectConfig, null, 2));
        log.info(`Updated ${name} project configuration.`);
      }
      return 'update';
    } else {
      log.info(`Nx project.json already exists at ${targetPath} - skipping update.`);
      return 'skip';
    }
  } else {
    if (dryRun) {
      log.info(`Would create ${name} project configuration.`);
    } else {
      log.info(`Creating ${name} project configuration @ ${targetPath}`);
      fs.writeFileSync(targetPath, JSON.stringify(projectConfig, null, 2));
    }
    return 'create';
  }
}

function filterPackages(allPackages: any[], filter: string | string[]) {
  return allPackages.filter((pkg) => {
    if (!filter) {
      return true;
    }

    if (typeof filter === 'string') {
      return pkg.name.includes(filter) || pkg.normalizedRepoRelativeDir.includes(filter);
    }

    if (Array.isArray(filter)) {
      return filter.some((f) => pkg.name.includes(f) || pkg.normalizedRepoRelativeDir.includes(f));
    }
    return false;
  });
}

function findAny(dir: string, files: string[]) {
  return files.find((f) => fs.existsSync(path.resolve(dir, f)));
}
