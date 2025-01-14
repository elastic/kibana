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

import yaml from 'js-yaml';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { getPackages, Package } from '@kbn/repo-packages';
import { ToolingLog } from '@kbn/tooling-log';

const readFile = (filePath: string) => fs.readFileSync(filePath, 'utf-8');
const writeYaml = (filePath: string, obj: any) =>
  fs.writeFileSync(
    filePath,
    yaml.dump(obj, {
      noRefs: true,
    })
  );

function generateProjectConfig(projectConfigTemplate: string, pkg: Package, kibanaJsonc: any) {
  const projectConfig: any = yaml.load(projectConfigTemplate);
  projectConfig.id = pkg.name;

  // is not a moon config, but it's useful to have at hand
  projectConfig.sourceRoot = pkg.normalizedRepoRelativeDir;
  if (pkg.isPlugin() || pkg.normalizedRepoRelativeDir.match(/^x-pack/)) {
    projectConfig.type = 'application';
  } else if (pkg.normalizedRepoRelativeDir.match(/^packages/)) {
    projectConfig.type = 'library';
  } else if (pkg.normalizedRepoRelativeDir.match(/^src/)) {
    projectConfig.type = 'tool';
  } else {
    projectConfig.type = 'unknown';
  }

  projectConfig.owners = {
    defaultOwner: kibanaJsonc.owner[0],
  };

  projectConfig.toolchain = {
    default: 'node',
  };

  projectConfig.project = {
    name: pkg.name,
    description: '',
    channel: '',
    owner: kibanaJsonc.owner[0],
    metadata: {},
  };

  projectConfig.tags = [pkg.getGroup(), kibanaJsonc.type, kibanaJsonc.devOnly ? 'dev' : 'prod'];

  return projectConfig;
}

function updateFieldsFromTsConfig(
  projectConfig: any,
  {
    log,
    tsConfigPath,
    implicitDependencies,
  }: {
    tsConfigPath: string;
    implicitDependencies: boolean;
    log: ToolingLog;
  }
) {
  log.verbose(`Reading tsconfig from ${tsConfigPath}`);

  // this is how we can read a JSON file that may contain comments
  // eslint-disable-next-line no-eval
  const tsConfig = eval('0,' + readFile(tsConfigPath));

  const tsInclude = (tsConfig.include || []).map((e: string) => `${e}`);
  const tsExclude = (tsConfig.exclude || []).map((e: string) => `!${e}`);
  const src = tsInclude
    .concat(tsExclude)
    .map((e: string) => e.replace(/.*typings/, '{workspaceRoot}/typings'));
  projectConfig.fileGroups = {
    src,
  };

  const dependencies = tsConfig.kbn_references;
  if (implicitDependencies && dependencies) {
    // TODO: some dependencies are referenced as objects
    projectConfig.dependsOn = dependencies.filter((e: any) => typeof e === 'string');
  }
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
    delete projectConfig.tasks.jest;
  } else {
    projectConfig.tasks.jest = {
      options: {
        jestConfig: `${jestConfigName}`,
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
      `Skipping lint task for project ${projectConfig.name}. It's explicitly ignored in .eslintignore`
    );
    delete projectConfig.tasks.lint;
    return;
  }

  const eslintConfigName = findAny(projectConfig.sourceRoot, ['.eslintrc.js', '.eslintrc.json']);

  if (eslintConfigName) {
    projectConfig.tasks.lint = {
      // options: {
      //   eslintConfig: `{projectRoot}/${eslintConfigName}`,
      // },
    };
  } else {
    // go with the default, which is {workspaceRoot}/.eslintrc.js
  }
}

export function regenerateMoonProjects() {
  return run(
    async ({ log, flags }) => {
      const filter: string | string[] | undefined =
        (flags.filter as string | string[]) || undefined;
      const update = flags.update as boolean | undefined;
      const dryRun = flags['dry-run'] as boolean | undefined;
      const implicitDependencies = !!flags['implicit-dependencies'];

      const template = readFile(path.resolve(__dirname, './moon.template.yml'));

      const allPackages: Package[] = getPackages(REPO_ROOT);

      const filteredPackages = filter ? filterPackages(allPackages, filter) : allPackages;

      const projectsCreated = [];
      const projectsUpdated = [];

      const eslintIgnore = readFile(path.resolve(REPO_ROOT, '.eslintignore'));

      for (const pkg of filteredPackages) {
        log.verbose(`Generating project configuration for ${pkg.name}`);
        const kibanaJsonc = readJsonc(path.resolve(pkg.normalizedRepoRelativeDir, 'kibana.jsonc'));
        const projectConfig = generateProjectConfig(template, pkg, kibanaJsonc);

        const tsConfigPath = path.resolve(pkg.normalizedRepoRelativeDir, 'tsconfig.json');
        if (fs.existsSync(tsConfigPath)) {
          updateFieldsFromTsConfig(projectConfig, {
            tsConfigPath,
            implicitDependencies,
            log,
          });
        } else {
          delete projectConfig.tasks.typecheck;
          log.warning(`Skipping ${pkg.name} - no tsconfig.json found.`);
        }

        await updateProjectJestConfig(projectConfig, {
          log,
        });

        await updateProjectLintConfig(projectConfig, {
          eslintIgnore,
          log,
        });

        const targetPath = path.resolve(pkg.normalizedRepoRelativeDir, 'moon.yml');
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
        `🎉 Moon project configuration successful: \n${projectsCreated.length} created, ${projectsUpdated.length} updated.`
      );
    },
    {
      usage: `node ${path.relative(REPO_ROOT, process.argv[1])}`,
      description: `
        Generates Moon project configuration for a package/plugin from available hints around the package/plugin.
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
  sortKeys(projectConfig);
  const name = projectConfig.id;
  const projectExists = fs.existsSync(targetPath);
  if (projectExists) {
    if (update) {
      if (dryRun) {
        log.info(`Would update ${name} project configuration.`);
      } else {
        writeYaml(targetPath, projectConfig);
        log.info(`Updated ${name} project configuration.`);
      }
      return 'update';
    } else {
      log.info(`moon.yml already exists at ${targetPath} - skipping update.`);
      return 'skip';
    }
  } else {
    if (dryRun) {
      log.info(`Would create ${name} project configuration.`);
    } else {
      log.info(`Creating ${name} project configuration @ ${targetPath}`);
      writeYaml(targetPath, projectConfig);
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

function readJsonc(filePath: string) {
  let fileCleaned;
  try {
    const file = readFile(filePath);
    fileCleaned = file
      .split('\n')
      .filter((l) => !l.match(/^\s*\/\//))
      .map((l) => l.replace(/\/\/.*/g, ''))
      .join('')
      .replace(/(\s)*/g, '')
      .replace(/,([}\]])/g, '$1');
    return JSON.parse(fileCleaned);
  } catch (e) {
    // eslint-ignore-next-line no-console
    console.error(`Failed to read ${filePath}: `, fileCleaned);
    throw e;
  }
}

const KEY_PRIORITY = [
  '$schema',
  'id',
  'sourceRoot',
  'type',
  'owners',
  'toolchain',
  '*', // everything else
  'tags',
  'fileGroups',
  'tasks',
];

function sortKeys(obj: any) {
  const kvPairs = Object.entries(obj);
  kvPairs.sort(([a], [b]) => {
    const aIdx =
      KEY_PRIORITY.indexOf(a) === -1 ? KEY_PRIORITY.indexOf('*') : KEY_PRIORITY.indexOf(a);
    const bIdx =
      KEY_PRIORITY.indexOf(b) === -1 ? KEY_PRIORITY.indexOf('*') : KEY_PRIORITY.indexOf(b);
    return aIdx - bIdx;
  });
  for (const [k] of kvPairs) {
    delete obj[k];
  }
  for (const [k, v] of kvPairs) {
    obj[k] = v;
  }
}
