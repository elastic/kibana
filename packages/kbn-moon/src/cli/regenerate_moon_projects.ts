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

import merge from 'lodash/merge';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import type { Package } from '@kbn/repo-packages';
import { getPackages } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';

const KIBANA_JSONC_FILENAME = 'kibana.jsonc';
const MOON_CONST = {
  MOON_CONFIG_FILE_NAME: 'moon.yml',
  EXTENSION_FILE_NAME: 'moon.extend.yml',
  JEST_CONFIG_FILES: ['jest.config.js', 'jest.config.cjs', 'jest.config.json'],
  ESLINT_CONFIG_FILES: ['.eslintrc.js', '.eslintrc.json'],
  PROJECT_TYPE_UNKNOWN: 'unknown',
  DEFAULT_TOOLCHAIN: 'node',
  TAG_JEST_UNIT: 'jest-unit-tests',
  TAG_DEV: 'dev',
  TAG_PROD: 'prod',
  TASK_NAME_JEST: 'jest',
  TASK_NAME_JEST_CI: 'jestCI',
  TASK_NAME_LINT: 'lint',
  FILE_GROUP_SRC: 'src',
};

interface ApplyTsConfigParams {
  tsConfigPath: string;
  implicitDependencies: boolean;
  log: ToolingLog;
  allPackageIds: string[];
}

interface ApplyJestConfigParams {
  log: ToolingLog;
}
interface ApplyLintConfigParams {
  log: ToolingLog;
  eslintIgnore: string;
}
interface ApplyDevOverridesParams {
  log: ToolingLog;
  devOverridesPath: string;
}

export function regenerateMoonProjects() {
  return run(
    async ({ log, flags }) => {
      const filter: string | string[] | undefined =
        (flags.filter as string | string[]) || undefined;
      const update = flags.update as boolean | undefined;
      const dryRun = flags['dry-run'] as boolean | undefined;
      const clear = flags.clear as boolean | undefined;

      const implicitDependencies = !!flags.dependencies;

      const template = readFile(path.resolve(__dirname, './moon.template.yml'));
      const eslintIgnore = readFile(path.resolve(REPO_ROOT, '.eslintignore'));

      const projectResults: Record<ProjectCreationResult, string[]> = {
        create: [],
        update: [],
        intact: [],
        delete: [],
        skip: [],
      };

      const packages: Package[] = filter
        ? filterPackages(getPackages(REPO_ROOT), filter)
        : getPackages(REPO_ROOT);
      const packageIds = packages.map((pkg) => pkg.name);

      for (const pkg of packages) {
        log.verbose(`Generating project configuration for ${pkg.name}`);
        const pathInPackage = (fileName: string) =>
          path.resolve(pkg.normalizedRepoRelativeDir, fileName);
        const kibanaJsonc = readJsonWithComments(pathInPackage(KIBANA_JSONC_FILENAME));
        const projectConfig = buildBaseProjectConfig(template, pkg, kibanaJsonc);

        const tsConfigPath = pathInPackage('tsconfig.json');
        if (fs.existsSync(tsConfigPath)) {
          applyTsConfigSettings(projectConfig, {
            tsConfigPath,
            implicitDependencies,
            log,
            allPackageIds: packageIds,
          });
        } else {
          projectConfig.language = 'javascript';
          log.warning(`Skipping ${pkg.name} - no tsconfig.json found.`);
        }

        await applyJestTaskConfig(projectConfig, { log });

        await applyLintTaskConfig(projectConfig, { eslintIgnore, log });

        applyDevOverrides(projectConfig, {
          log,
          devOverridesPath: pathInPackage(MOON_CONST.EXTENSION_FILE_NAME),
        });

        const targetPath = pathInPackage(MOON_CONST.MOON_CONFIG_FILE_NAME);

        const result = writeProjectConfigFile(targetPath, projectConfig, {
          update,
          clear,
          dryRun,
          log,
        });
        projectResults[result].push(pkg.name);
      }

      log.success(
        [
          `🎉 Moon project configuration successful:`,
          ` ${projectResults.create.length} created`,
          ` ${projectResults.delete.length} deleted`,
          ` ${projectResults.update.length} updated`,
          ` ${projectResults.intact.length} already up to date`,
          ` ${projectResults.skip.length} exists (use --update to update)`,
        ].join('\n')
      );
    },
    {
      usage: `node ${path.relative(REPO_ROOT, process.argv[1])}`,
      description: `
        Generates Moon project configuration for a package/plugin from available hints around the package/plugin.
      `,
      flags: {
        string: ['filter'],
        boolean: ['dry-run', 'update', 'dependencies', 'clear'],
        default: {},
        alias: {},
        help: `
          --filter                    Filter packages by name or directory
          --update                    Update existing project configuration(s)
          --dependencies              Include dependsOn section in the project configuration
          --dry-run                   Do not write to disk
          --clear                     Clear the project configuration
        `,
      },
    }
  );
}

const getGeneratedPreambleForProject = (projectId: string) =>
  [
    '# This file is generated by the @kbn/moon package. Any manual edits will be erased!',
    `#  To extend this, write your extensions/overrides to '${MOON_CONST.EXTENSION_FILE_NAME}'`,
    `#  then regenerate this file with: 'node scripts/regenerate_moon_projects --update --filter ${projectId}'`,
  ].join('\n');

const readFile = (filePath: string) => fs.readFileSync(filePath, 'utf-8');
const writeYaml = (filePath: string, obj: any, preamble: string | null = null) => {
  let fileContent = yaml.dump(obj, {
    noRefs: true,
  });

  if (preamble) {
    fileContent = preamble + '\n\n' + fileContent;
  }

  if (fs.existsSync(filePath) && readFile(filePath) === fileContent) {
    return false;
  } else {
    fs.writeFileSync(filePath, fileContent);
    return true;
  }
};

function buildBaseProjectConfig(projectConfigTemplate: string, pkg: Package, kibanaJsonc: any) {
  const projectConfig: any = yaml.load(projectConfigTemplate);
  projectConfig.id = pkg.name;
  projectConfig.type = MOON_CONST.PROJECT_TYPE_UNKNOWN; // we currently don't make use of this

  const owner = Array.isArray(kibanaJsonc.owner) ? kibanaJsonc.owner[0] : kibanaJsonc.owner;

  projectConfig.owners = { defaultOwner: owner };

  projectConfig.toolchain = { default: MOON_CONST.DEFAULT_TOOLCHAIN };

  projectConfig.project = {
    name: pkg.name,
    description: `Moon project for ${pkg.name}`,
    channel: '',
    owner,
    metadata: {
      // Not a Moon config field; included for convenience
      sourceRoot: pkg.normalizedRepoRelativeDir,
    },
  };

  projectConfig.tags = [
    pkg.getGroup(),
    kibanaJsonc.type,
    kibanaJsonc.devOnly ? MOON_CONST.TAG_DEV : MOON_CONST.TAG_PROD,
  ];

  return projectConfig;
}

function applyTsConfigSettings(
  projectConfig: any,
  { log, tsConfigPath, implicitDependencies, allPackageIds }: ApplyTsConfigParams
) {
  log.verbose(`Reading tsconfig from ${tsConfigPath}`);

  // this is how we can read a JSON file that may contain comments
  // eslint-disable-next-line no-eval
  const tsConfig = eval('0,' + readFile(tsConfigPath));

  const rootRelativeTypings = path.join(
    path.relative(projectConfig.project.metadata.sourceRoot, REPO_ROOT),
    'typings'
  );

  const tsInclude = (tsConfig.include || []).map((e: string) => `${e}`);
  const tsExclude = (tsConfig.exclude || []).map((e: string) => `!${e}`);
  const src = tsInclude
    .concat(tsExclude)
    .map((e: string) => e.replace(/.*typings/, rootRelativeTypings))
    .filter((e: string) => !e.startsWith('..')); // in Moon, parent-relative file deps are not allowed
  projectConfig.fileGroups = { [MOON_CONST.FILE_GROUP_SRC]: src };

  const dependencies = tsConfig.kbn_references;
  if (implicitDependencies && dependencies) {
    // TODO: some dependencies are referenced as objects
    projectConfig.dependsOn = dependencies
      .filter((e: any) => typeof e === 'string')
      .filter((e: string) => allPackageIds.includes(e));
  }
}

async function applyJestTaskConfig(projectConfig: any, { log }: ApplyJestConfigParams) {
  const jestConfigName = resolveFirstExisting(
    projectConfig.project.metadata.sourceRoot,
    MOON_CONST.JEST_CONFIG_FILES
  );

  if (!jestConfigName) {
    log.warning(
      `Could not find jest config for ${projectConfig.name} @ ${projectConfig.project.metadata.sourceRoot}`
    );
  } else {
    projectConfig.tags = (projectConfig.tags || []).concat([MOON_CONST.TAG_JEST_UNIT]);
    projectConfig.tasks = projectConfig.tasks || {};
    projectConfig.tasks[MOON_CONST.TASK_NAME_JEST] = {
      args: ['--config', `$projectRoot/${jestConfigName}`],
      inputs: ['@group(src)'],
    };
    projectConfig.tasks[MOON_CONST.TASK_NAME_JEST_CI] = {
      args: ['--config', `$projectRoot/${jestConfigName}`],
      inputs: ['@group(src)'],
    };
  }
}

async function applyLintTaskConfig(
  projectConfig: any,
  { log, eslintIgnore }: ApplyLintConfigParams
) {
  if (eslintIgnore.split('\n').includes('/' + projectConfig.project.metadata.sourceRoot)) {
    log.info(
      `Skipping lint task for project ${projectConfig.name}. It's explicitly ignored in .eslintignore`
    );
    if (projectConfig.tasks) {
      delete projectConfig.tasks[MOON_CONST.TASK_NAME_LINT];
    }
    return;
  }

  const eslintConfigName = resolveFirstExisting(
    projectConfig.project.metadata.sourceRoot,
    MOON_CONST.ESLINT_CONFIG_FILES
  );

  if (eslintConfigName) {
    projectConfig.tasks = projectConfig.tasks || {};
    projectConfig.tasks[MOON_CONST.TASK_NAME_LINT] = {
      // options: {
      //   eslintConfig: `{projectRoot}/${eslintConfigName}`,
      // },
    };
  } else {
    // go with the default, which is {workspaceRoot}/.eslintrc.js
  }
}

type ProjectCreationResult = 'create' | 'update' | 'intact' | 'delete' | 'skip';
function writeProjectConfigFile(
  targetPath: string,
  projectConfig: any,
  {
    clear,
    update,
    dryRun,
    log,
  }: {
    clear?: boolean;
    update?: boolean;
    dryRun?: boolean;
    log: ToolingLog;
  }
): ProjectCreationResult {
  reorderKeysByPriority(projectConfig);
  const name = projectConfig.id;
  const projectExists = fs.existsSync(targetPath);
  if (projectExists) {
    if (update) {
      if (dryRun) {
        log.info(`Would update ${name} project configuration.`);
      } else {
        const didUpdate = writeYaml(
          targetPath,
          projectConfig,
          getGeneratedPreambleForProject(projectConfig.id)
        );
        log.info(`Updated ${name} project configuration.`);
        if (!didUpdate) {
          return 'intact';
        }
      }
      return 'update';
    } else if (clear) {
      if (dryRun) {
        log.info(`Would clear ${name} project configuration.`);
      } else {
        log.info(`Deleting ${name} project configuration @ ${targetPath}`);
        fs.unlinkSync(targetPath);
      }
      return 'delete';
    } else {
      log.info(
        `'${MOON_CONST.MOON_CONFIG_FILE_NAME}' already exists at ${targetPath} - skipping creation.`
      );
      return 'skip';
    }
  } else {
    if (dryRun) {
      log.info(`Would create ${name} project configuration.`);
    } else {
      log.info(`Creating ${name} project configuration @ ${targetPath}`);
      writeYaml(targetPath, projectConfig, getGeneratedPreambleForProject(projectConfig.id));
    }
    return 'create';
  }
}

function filterPackages(allPackages: Package[], filter: string | string[]): Package[] {
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

function resolveFirstExisting(dir: string, files: string[]) {
  return files.find((f) => fs.existsSync(path.resolve(dir, f)));
}

function readJsonWithComments(filePath: string) {
  let fileCleaned;
  try {
    const file = readFile(filePath);
    fileCleaned = file
      .split('\n')
      .filter((l) => !l.match(/^\s*\/\//))
      .map((l) => l.replace(/\/\/.*$/g, ''))
      .join('')
      .replace(/(\s)*/g, '')
      .replace(/,([}\]])/g, '$1');
    return JSON.parse(fileCleaned);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to read ${filePath}: `, fileCleaned);
    throw e;
  }
}

function reorderKeysByPriority(obj: any) {
  const KEY_ORDER = [
    '$schema',
    'id',
    'type',
    'owners',
    'toolchain',
    '*', // everything else
    'tags',
    'fileGroups',
    'tasks',
  ];
  const kvPairs = Object.entries(obj);
  kvPairs.sort(([a], [b]) => {
    const aIdx = KEY_ORDER.indexOf(a) === -1 ? KEY_ORDER.indexOf('*') : KEY_ORDER.indexOf(a);
    const bIdx = KEY_ORDER.indexOf(b) === -1 ? KEY_ORDER.indexOf('*') : KEY_ORDER.indexOf(b);
    return aIdx - bIdx;
  });
  for (const [k] of kvPairs) {
    delete obj[k];
  }
  for (const [k, v] of kvPairs) {
    obj[k] = v;
  }
}

function applyDevOverrides(projectConfig: any, { log, devOverridesPath }: ApplyDevOverridesParams) {
  if (fs.existsSync(devOverridesPath)) {
    log.info(`Applying development overrides from ${path.relative(REPO_ROOT, devOverridesPath)}`);
    try {
      const devOverrides = yaml.load(readFile(devOverridesPath));
      merge(projectConfig, devOverrides);
    } catch (e) {
      log.error(
        `Failed to apply development overrides from ${path.relative(
          REPO_ROOT,
          devOverridesPath
        )}: ${e.message}`
      );
      throw e;
    }
  }
}

if (module.parent === null) {
  regenerateMoonProjects();
}
