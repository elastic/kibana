const path = require('path');
const fs = require('fs');
const isEmpty = require('lodash.isempty');
const get = require('lodash.get');
const stripJsonComments = require('strip-json-comments');
const Joi = require('joi');
const { InvalidConfigError, InvalidJsonError } = require('./errors');
const env = require('./env');
const rpc = require('./rpc');
const prompts = require('./prompts');
const schemas = require('./schemas');

async function maybeCreateGlobalConfigAndFolder() {
  const REPOS_PATH = env.getReposPath();
  await rpc.mkdirp(REPOS_PATH);
  await maybeCreateGlobalConfig();
}

async function maybeCreateGlobalConfig() {
  const GLOBAL_CONFIG_PATH = env.getGlobalConfigPath();

  try {
    const configTemplate = await getConfigTemplate();
    await rpc.writeFile(GLOBAL_CONFIG_PATH, configTemplate, {
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

function getConfigTemplate() {
  return rpc.readFile(path.join(__dirname, 'configTemplate.json'), 'utf8');
}

function validateGlobalConfig(config, filename) {
  const { error } = Joi.validate(
    config,
    schemas.globalConfig,
    schemas.joiOptions
  );

  if (error) {
    throw new InvalidConfigError(
      `The global config file (${filename}) is not valid:\n${schemas.formatError(
        error
      )}`
    );
  }

  if (!hasRestrictedPermissions(filename)) {
    throw new InvalidConfigError(
      `The global config file (${filename}) needs to have more restrictive permissions. Run the following to limit access to the file to just your user account:
      chmod 600 "${filename}"\n`
    );
  }

  return config;
}

function validateProjectConfig(config, filepath) {
  const { error } = Joi.validate(
    config,
    schemas.projectConfig,
    schemas.joiOptions
  );

  if (error) {
    throw new InvalidConfigError(
      `The project config file (${filepath}) is not valid:\n${schemas.formatError(
        error
      )}`
    );
  }
  return config;
}

function validateCombinedConfig(config) {
  const { branches } = config;
  if (isEmpty(branches)) {
    throw new InvalidConfigError(
      `"branches" array in config cannot be empty:\n ${JSON.stringify(
        config,
        null,
        4
      )}`
    );
  }
  return config;
}

function hasRestrictedPermissions(GLOBAL_CONFIG_PATH) {
  const stat = rpc.statSync(GLOBAL_CONFIG_PATH);
  const hasGroupRead = stat.mode & fs.constants.S_IRGRP; // eslint-disable-line no-bitwise
  const hasOthersRead = stat.mode & fs.constants.S_IROTH; // eslint-disable-line no-bitwise
  return !hasGroupRead && !hasOthersRead;
}

async function readConfigFile(filepath) {
  const fileContents = await rpc.readFile(filepath, 'utf8');
  const configWithoutComments = stripJsonComments(fileContents);

  try {
    return JSON.parse(configWithoutComments);
  } catch (e) {
    throw new InvalidJsonError(e.message, filepath, fileContents);
  }
}

async function getGlobalConfig() {
  await maybeCreateGlobalConfigAndFolder();

  const GLOBAL_CONFIG_PATH = env.getGlobalConfigPath();
  const config = await readConfigFile(GLOBAL_CONFIG_PATH);
  return validateGlobalConfig(config, GLOBAL_CONFIG_PATH);
}

async function getProjectConfig() {
  const filepath = await rpc.findUp('.backportrc.json');
  if (!filepath) {
    return null;
  }

  const config = await readConfigFile(filepath);
  return validateProjectConfig(config, filepath);
}

async function getCombinedConfig() {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig()
  ]);

  return _getCombinedConfig(projectConfig, globalConfig);
}

async function _getCombinedConfig(projectConfig, globalConfig) {
  if (!projectConfig) {
    const globalProjects = get(globalConfig, 'projects', []).filter(
      project => !isEmpty(project.branches) && project.upstream
    );

    if (isEmpty(globalProjects)) {
      const GLOBAL_CONFIG_PATH = env.getGlobalConfigPath();
      throw new InvalidConfigError(
        `Global config (${GLOBAL_CONFIG_PATH}) does not contain any valid projects, and no project config (.backportrc.json) was found.\nDocumentation: https://github.com/sqren/backport#global-configuration`
      );
    }

    const upstream = await prompts.listProjects(
      globalProjects.map(project => project.upstream)
    );

    return validateCombinedConfig(
      mergeConfigs(projectConfig, globalConfig, upstream)
    );
  }

  return validateCombinedConfig(
    mergeConfigs(projectConfig, globalConfig, projectConfig.upstream)
  );
}

function mergeConfigs(projectConfig, globalConfig, upstream) {
  const globalProjectConfig =
    !isEmpty(globalConfig.projects) &&
    globalConfig.projects.find(project => project.upstream === upstream);

  return {
    ...projectConfig,
    accessToken: globalConfig.accessToken,
    username: globalConfig.username,
    ...globalProjectConfig
  };
}

module.exports = {
  _getCombinedConfig,
  getCombinedConfig,
  getGlobalConfig,
  getProjectConfig,
  maybeCreateGlobalConfig,
  maybeCreateGlobalConfigAndFolder,
  mergeConfigs,
  validateGlobalConfig,
  validateProjectConfig
};
