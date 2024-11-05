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

function generateProjectConfig(
  tsConfig: { include?: string[]; exclude?: string[]; kbn_references?: [] },
  template: string,
  pkg: Package
) {
  const tsInclude = tsConfig.include || [];
  const tsExclude = tsConfig.exclude || [];
  const src = tsInclude.concat(tsExclude.map((ex: string) => `!${ex}`));
  const dependencies = tsConfig.kbn_references || [];

  const projectConfig = JSON.parse(template);
  projectConfig.name = pkg.name;
  projectConfig.namedInputs = projectConfig.namedInputs || {};
  projectConfig.namedInputs.src = src;
  projectConfig.implicitDependencies = dependencies;
  return projectConfig;
}

export function regenerateNxProjects() {
  run(
    async ({ log, flags }) => {
      const filter: string | string[] | undefined =
        (flags.filter as string | string[]) || undefined;
      const update = flags.update as boolean | undefined;
      const dryRun = flags['dry-run'] as boolean | undefined;

      const template = fs.readFileSync(path.resolve(__dirname, 'project.template.json'), 'utf8');
      const allPackages: Package[] = getPackages(REPO_ROOT);

      const filteredPackages = filter ? filterPackages(allPackages, filter) : allPackages;

      const projectsCreated = [];
      const projectsUpdated = [];

      for (const pkg of filteredPackages) {
        log.verbose(`Generating project configuration for ${pkg.name}`);
        const tsConfigPath = path.resolve(pkg.normalizedRepoRelativeDir, 'tsconfig.json');

        if (!fs.existsSync(tsConfigPath)) {
          log.warning(`Skipping ${pkg.name} - no tsconfig.json found.`);
          continue;
        }

        log.verbose(`Reading tsconfig from ${tsConfigPath}`);
        // eslint-disable-next-line no-eval
        const tsConfig = eval('0,' + fs.readFileSync(tsConfigPath, 'utf8'));

        log.verbose(`Generating project configuration for ${pkg.name}`);
        const projectConfig = generateProjectConfig(tsConfig, template, pkg);
        const targetPath = path.resolve(pkg.normalizedRepoRelativeDir, 'project.json');

        log.verbose(`Writing project configuration to ${targetPath}`);
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
        string: ['filter', 'dry-run', 'update'],
        default: {},
        alias: {},
        help: `
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
    if (update) {
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
