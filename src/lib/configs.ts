import path from 'path';
import isEmpty from 'lodash.isempty';
import isString from 'lodash.isstring';
import findUp from 'find-up';
import stripJsonComments from 'strip-json-comments';
import { HandledError } from './errors';
import * as env from './env';
import * as rpc from './rpc';
import {
  CombinedConfig,
  BranchChoice,
  BackportOptions,
  ProjectConfig
} from '../types/types';
import { validateGlobalConfig, validateProjectConfig } from './schemas';

export async function maybeCreateGlobalConfigAndFolder() {
  const reposPath = env.getReposPath();
  const globalConfigPath = env.getGlobalConfigPath();
  const configTemplate = await getConfigTemplate();
  await rpc.mkdirp(reposPath);
  await maybeCreateGlobalConfig(globalConfigPath, configTemplate);
  await ensureCorrectPermissions(globalConfigPath);
}

function ensureCorrectPermissions(globalConfigPath: string) {
  return rpc.chmod(globalConfigPath, '600');
}

export async function maybeCreateGlobalConfig(
  globalConfigPath: string,
  configTemplate: string
) {
  try {
    await rpc.writeFile(globalConfigPath, configTemplate, {
      flag: 'wx', // create and write file. Error if it already exists
      mode: 0o600 // give the owner read-write privleges, no access for others
    });
  } catch (e) {
    const FILE_ALREADY_EXISTS = 'EEXIST';
    if (e.code !== FILE_ALREADY_EXISTS) {
      throw e;
    }
  }
}

export function getConfigTemplate() {
  const p = path.join(__dirname, '../../templates/configTemplate.json');
  return rpc.readFile(p, 'utf8');
}

async function readConfigFile(filepath: string) {
  const fileContents = await rpc.readFile(filepath, 'utf8');
  const configWithoutComments = stripJsonComments(fileContents);

  try {
    return JSON.parse(configWithoutComments);
  } catch (e) {
    throw new HandledError(
      `"${filepath}" contains invalid JSON:\n\n${fileContents}\n\nTry validating the file on https://jsonlint.com/`
    );
  }
}

export async function getGlobalConfig() {
  await maybeCreateGlobalConfigAndFolder();

  const globalConfigPath = env.getGlobalConfigPath();
  const config = await readConfigFile(globalConfigPath);
  return validateGlobalConfig(config, globalConfigPath);
}

export async function getProjectConfig(): Promise<ProjectConfig | null> {
  const filepath = await findUp('.backportrc.json');
  if (!filepath) {
    return null;
  }

  const config = validateProjectConfig(
    await readConfigFile(filepath),
    filepath
  );

  const { branches, ...configRest } = config;
  return {
    ...configRest,
    branchChoices: config.branches.map(
      (choice: string | BranchChoice): BranchChoice => {
        return isString(choice)
          ? {
              name: choice,
              checked: false
            }
          : choice;
      }
    )
  };
}

export async function getCombinedConfig(): Promise<CombinedConfig> {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig()
  ]);

  return {
    // defaults
    multiple: false,
    multipleCommits: false,
    multipleBranches: true,
    all: false,
    labels: [],

    // configs
    ...globalConfig,
    ...projectConfig
  };
}

export function validateOptions(options: Partial<BackportOptions>) {
  if (isEmpty(options.branches) && isEmpty(options.branchChoices)) {
    throw new Error(
      `Missing branch\n\nYou must either:\n - Add a .backportrc.json. Read more: https://github.com/sqren/backport/blob/master/docs/configuration.md#project-specific-configuration\n - Add branch as CLI argument: "--branch 6.1" `
    );
  }

  if (!options.upstream) {
    throw new Error(
      `Missing upstream\n\nYou must either:\n - Add a .backportrc.json. Read more: https://github.com/sqren/backport/blob/master/docs/configuration.md#project-specific-configuration\n - Add upstream as CLI argument: "--upstream elastic/kibana" `
    );
  }
  return options as BackportOptions;
}
