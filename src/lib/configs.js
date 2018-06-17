const path = require('path');
const isEmpty = require('lodash.isempty');
const findUp = require('find-up');
const stripJsonComments = require('strip-json-comments');
const { InvalidConfigError, InvalidJsonError } = require('./errors');
const env = require('./env');
const rpc = require('./rpc');
const schemas = require('./schemas');

async function maybeCreateGlobalConfigAndFolder() {
  const reposPath = env.getReposPath();
  const globalConfigPath = env.getGlobalConfigPath();
  const configTemplate = await getConfigTemplate();
  await rpc.mkdirp(reposPath);
  await maybeCreateGlobalConfig(globalConfigPath, configTemplate);
  await ensureCorrectPermissions(globalConfigPath);
}

function ensureCorrectPermissions(globalConfigPath) {
  return rpc.chmod(globalConfigPath, '600');
}

async function maybeCreateGlobalConfig(globalConfigPath, configTemplate) {
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

function getConfigTemplate() {
  return rpc.readFile(path.join(__dirname, 'configTemplate.json'), 'utf8');
}

function validateGlobalConfig(config, filename) {
  const { error } = schemas.validate(config, schemas.globalConfig);

  if (error) {
    throw new InvalidConfigError(
      `The global config file (${filename}) is not valid:\n${schemas.formatError(
        error
      )}`
    );
  }

  return config;
}

function validateProjectConfig(config, filepath) {
  const { error } = schemas.validate(config, schemas.projectConfig);

  if (error) {
    throw new InvalidConfigError(
      `The project config file (${filepath}) is not valid:\n${schemas.formatError(
        error
      )}`
    );
  }
  return config;
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

  const globalConfigPath = env.getGlobalConfigPath();
  const config = await readConfigFile(globalConfigPath);
  return validateGlobalConfig(config, globalConfigPath);
}

async function getProjectConfig() {
  const filepath = await findUp('.backportrc.json');
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

  return {
    // defaults
    multiple: false,
    multipleCommits: false,
    multipleBranches: true,
    all: false,

    // configs
    ...globalConfig,
    ...projectConfig
  };
}

function validateConfigWithCliArgs(config, options) {
  if (isEmpty(config.branches) && isEmpty(options.branches)) {
    throw new Error(
      `Missing branch\n\nYou must either:\n - Add a .backportrc.json. Read more: https://github.com/sqren/backport/blob/master/docs/configuration.md#project-specific-configuration\n - Add branch as CLI argument: "--branch 6.1" `
    );
  }

  if (!config.upstream) {
    throw new Error(
      `Missing upstream\n\nYou must either:\n - Add a .backportrc.json. Read more: https://github.com/sqren/backport/blob/master/docs/configuration.md#project-specific-configuration\n - Add upstream as CLI argument: "--upstream elastic/kibana" `
    );
  }
}

module.exports = {
  validateConfigWithCliArgs,
  getCombinedConfig,
  getGlobalConfig,
  getProjectConfig,
  maybeCreateGlobalConfig,
  maybeCreateGlobalConfigAndFolder,
  validateGlobalConfig,
  validateProjectConfig
};
