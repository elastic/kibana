/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const { inspect } = require('util');

const {
  isObj,
  isValidId,
  isValidPkgType,
  isArrOfIds,
  isArrOfStrings,
  PACKAGE_TYPES,
} = require('./parse_utils');
const { parse } = require('./jsonc');

/**
 * @param {string} key
 * @param {unknown} value
 * @param {string} msg
 * @returns {Error}
 */
const err = (key, value, msg) => {
  const dbg = ['string', 'number', 'boolean'].includes(typeof value) ? value : inspect(value);
  return new Error(`invalid package "${key}" [${dbg}], ${msg}`);
};

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const isValidOwner = (v) => typeof v === 'string' && v.startsWith('@');

/**
 * @param {unknown} plugin
 * @returns {import('./types').PluginPackageManifest['plugin']}
 */
function validatePackageManifestPlugin(plugin) {
  if (!isObj(plugin)) {
    throw err(`plugin`, plugin, `must be an object`);
  }

  const {
    id,
    configPath,
    requiredPlugins,
    optionalPlugins,
    description,
    enabledOnAnonymousPages,
    serviceFolders,
    ...extra
  } = plugin;

  const extraKeys = Object.keys(extra);
  if (extraKeys.length) {
    throw new Error(`unexpected keys in "plugin" of package [${extraKeys.join(', ')}]`);
  }

  if (typeof id !== 'string' || !isValidId(id)) {
    throw err(`plugin.id`, id, `must be a string in camel or snake case`);
  }

  if (configPath !== undefined && !isArrOfIds(configPath)) {
    throw err(
      `plugin.configPath`,
      configPath,
      `must be an array of strings in camel or snake case`
    );
  }

  if (requiredPlugins !== undefined && !isArrOfIds(requiredPlugins)) {
    throw err(
      `plugin.requiredPlugins`,
      requiredPlugins,
      `must be an array of strings in camel or snake case`
    );
  }

  if (optionalPlugins !== undefined && !isArrOfIds(optionalPlugins)) {
    throw err(
      `plugin.requiredPlugins`,
      optionalPlugins,
      `must be an array of strings in camel or snake case`
    );
  }

  if (description !== undefined && typeof description !== 'string') {
    throw err(`plugin.description`, description, `must be a string`);
  }

  if (enabledOnAnonymousPages !== undefined && typeof enabledOnAnonymousPages !== 'boolean') {
    throw err(`plugin.enabledOnAnonymousPages`, enabledOnAnonymousPages, `must be a boolean`);
  }

  if (serviceFolders !== undefined && !isArrOfStrings(serviceFolders)) {
    throw err(`plugin.serviceFolders`, serviceFolders, `must be an array of strings`);
  }

  return {
    id,
    configPath,
    requiredPlugins,
    optionalPlugins,
    description,
    enabledOnAnonymousPages,
    serviceFolders,
  };
}

/**
 * Validate the contents of a parsed kibana.jsonc file.
 * @param {unknown} parsed
 * @returns {import('./types').KibanaPackageManifest}
 */
function validatePackageManifest(parsed) {
  if (!isObj(parsed)) {
    throw new Error('expected manifest root to be an object');
  }

  const { type, id, owner, devOnly, plugin, sharedBrowserBundle, ...extra } = parsed;

  const extraKeys = Object.keys(extra);
  if (extraKeys.length) {
    throw new Error(`unexpected keys in package manifest [${extraKeys.join(', ')}]`);
  }

  if (!isValidPkgType(type)) {
    throw err(`type`, type, `options are [${PACKAGE_TYPES.join(', ')}]`);
  }

  if (typeof id !== 'string' || !id.startsWith('@kbn/')) {
    throw err(`id`, id, `must be a string that starts with @kbn/`);
  }

  if (
    !(Array.isArray(owner) && owner.every(isValidOwner)) &&
    !(typeof owner === 'string' && isValidOwner(owner))
  ) {
    throw err(
      `owner`,
      owner,
      `must be a valid Github team handle starting with @, or an array of such handles`
    );
  }

  if (devOnly !== undefined && typeof devOnly !== 'boolean') {
    throw err(`devOnly`, devOnly, `must be a boolean when defined`);
  }

  const base = {
    id,
    owner: Array.isArray(owner) ? owner : [owner],
    devOnly,
  };

  // return if this is one of the more basic types of package types
  if (type === 'shared-server' || type === 'functional-tests' || type === 'test-helper') {
    return {
      type,
      ...base,
    };
  }

  // handle the plugin field for plugin-* types
  if (type === 'plugin-browser' || type === 'plugin-server') {
    return {
      type,
      ...base,
      plugin: validatePackageManifestPlugin(plugin),
    };
  }

  // parse the sharedBrowserBundle for shared-browser and shared-common types
  if (sharedBrowserBundle !== undefined && typeof sharedBrowserBundle !== 'boolean') {
    throw err(`sharedBrowserBundle`, sharedBrowserBundle, `must be a boolean when defined`);
  }
  return {
    type,
    ...base,
    sharedBrowserBundle,
  };
}

/**
 * Parse a kibana.jsonc file from the filesystem
 * @param {string} path
 */
function readPackageManifest(path) {
  let content;
  try {
    content = Fs.readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Missing kibana.jsonc file at ${path}`);
    }

    throw error;
  }

  try {
    return parsePackageManifest(content);
  } catch (error) {
    throw new Error(`Unable to parse [${path}]: ${error.message}`);
  }
}

/**
 * Parse a kibana.jsonc file from a string
 * @param {string} content
 */
function parsePackageManifest(content) {
  let parsed;
  try {
    parsed = parse(content);
  } catch (error) {
    throw new Error(`Invalid JSONc: ${error.message}`);
  }

  return validatePackageManifest(parsed);
}

module.exports = { parsePackageManifest, readPackageManifest, validatePackageManifest };
