const path = require('path');
const fs = require('fs');
const isEmpty = require('lodash.isempty');
const get = require('lodash.get');
const stripJsonComments = require('strip-json-comments');
const Joi = require('joi');
const constants = require('./constants');
const env = require('./env');
const rpc = require('./rpc');
const prompts = require('./prompts');
const schemas = require('./schemas');

function maybeCreateGlobalConfigAndFolder() {
  const REPOS_PATH = env.getReposPath();
  return rpc.mkdirp(REPOS_PATH).then(maybeCreateGlobalConfig);
}

function maybeCreateGlobalConfig() {
  const GLOBAL_CONFIG_PATH = env.getGlobalConfigPath();

  return getConfigTemplate().then(configTemplate => {
    return rpc
      .writeFile(GLOBAL_CONFIG_PATH, configTemplate, {
        flag: 'wx', // create and write file. Error if it already exists
        mode: 0o600 // give the owner read-write privleges, no access for others
      })
      .catch(e => {
        const FILE_ALREADY_EXISTS = 'EEXIST';
        if (e.code !== FILE_ALREADY_EXISTS) {
          throw e;
        }
      });
  });
}

function getConfigTemplate() {
  return rpc.readFile(path.join(__dirname, 'configTemplate.json'), 'utf8');
}

class InvalidConfigError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, InvalidConfigError);
    this.code = constants.INVALID_CONFIG;
  }
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

function readConfigFile(filepath) {
  return rpc
    .readFile(filepath, 'utf8')
    .then(fileContents => JSON.parse(stripJsonComments(fileContents)));
}

function getGlobalConfig() {
  const GLOBAL_CONFIG_PATH = env.getGlobalConfigPath();
  return maybeCreateGlobalConfigAndFolder()
    .then(() => readConfigFile(GLOBAL_CONFIG_PATH))
    .then(config => validateGlobalConfig(config, GLOBAL_CONFIG_PATH));
}

function getProjectConfig() {
  return rpc.findUp('.backportrc.json').then(filepath => {
    if (!filepath) {
      return null;
    }

    return readConfigFile(filepath).then(config =>
      validateProjectConfig(config, filepath)
    );
  });
}

function getCombinedConfig() {
  return Promise.all([getProjectConfig(), getGlobalConfig()]).then(
    ([projectConfig, globalConfig]) =>
      _getCombinedConfig(projectConfig, globalConfig)
  );
}

function _getCombinedConfig(projectConfig, globalConfig) {
  return Promise.resolve().then(() => {
    if (!projectConfig) {
      const globalProjects = get(globalConfig, 'projects', []).filter(
        project => !isEmpty(project.branches) && project.upstream
      );
      if (isEmpty(globalProjects)) {
        throw new InvalidConfigError('.backportrc.json was not found');
      }

      return prompts
        .listProjects(globalProjects.map(project => project.upstream))
        .then(upstream => {
          return validateCombinedConfig(
            mergeConfigs(projectConfig, globalConfig, upstream)
          );
        });
    }
    return validateCombinedConfig(
      mergeConfigs(projectConfig, globalConfig, projectConfig.upstream)
    );
  });
}

function mergeConfigs(projectConfig, globalConfig, upstream) {
  const globalProjectConfig =
    !isEmpty(globalConfig.projects) &&
    globalConfig.projects.find(project => project.upstream === upstream);

  return Object.assign(
    {},
    projectConfig,
    {
      accessToken: globalConfig.accessToken,
      username: globalConfig.username
    },
    globalProjectConfig
  );
}

module.exports = {
  getGlobalConfig,
  getProjectConfig,
  maybeCreateGlobalConfig,
  getCombinedConfig,
  _getCombinedConfig,
  mergeConfigs,
  validateProjectConfig,
  validateGlobalConfig
};
