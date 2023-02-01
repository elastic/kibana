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
  isSomeString,
  isObj,
  isValidPluginId,
  isValidPkgType,
  isArrOfIds,
  isArrOfStrings,
  PACKAGE_TYPES,
} = require('./parse_helpers');
const { parse } = require('../utils/jsonc');

/**
 * @param {string} key
 * @param {unknown} value
 * @param {string} msg
 * @returns {Error}
 */
const err = (key, value, msg) => {
  const dbg = ['string', 'number', 'boolean', 'undefined'].includes(typeof value)
    ? value
    : inspect(value);
  return new Error(`invalid package "${key}" [${dbg}], ${msg}`);
};

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const isValidOwner = (v) => typeof v === 'string' && v.startsWith('@');

/**
 * @param {unknown} plugin
 * @returns {import('./types').PluginPackageManifest['plugin']} plugin
 */
function validatePackageManifestPlugin(plugin) {
  if (!isObj(plugin)) {
    throw err('plugin', plugin, 'must be an object');
  }

  const {
    id,
    browser,
    server,
    extraPublicDirs,
    configPath,
    requiredPlugins,
    optionalPlugins,
    requiredBundles,
    enabledOnAnonymousPages,
    type,
  } = plugin;

  if (!isValidPluginId(id)) {
    throw err(`plugin.id`, id, `must be a string in camel or snake case`);
  }
  if (typeof browser !== 'boolean') {
    throw err('plugin.browser', browser, 'must be a boolean');
  }
  if (typeof server !== 'boolean') {
    throw err('plugin.server', server, 'must be a boolean');
  }
  if (extraPublicDirs !== undefined && !isArrOfStrings(extraPublicDirs)) {
    throw err(`plugin.extraPublicDirs`, extraPublicDirs, `must be an array of strings`);
  }
  if (configPath !== undefined && !(isSomeString(configPath) || isArrOfStrings(configPath))) {
    throw err(
      `plugin.configPath`,
      configPath,
      `must be a non-empty string, or an array of non-empty strings`
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

  if (requiredBundles !== undefined && !isArrOfIds(requiredBundles)) {
    throw err(
      `plugin.requiredBundles`,
      requiredBundles,
      `must be an array of strings in camel or snake case`
    );
  }

  if (enabledOnAnonymousPages !== undefined && typeof enabledOnAnonymousPages !== 'boolean') {
    throw err(`plugin.enabledOnAnonymousPages`, enabledOnAnonymousPages, `must be a boolean`);
  }

  if (type !== undefined && type !== 'preboot') {
    throw err(`plugin.type`, type, `must be undefined or "preboot"`);
  }

  return {
    id,
    browser,
    server,
    type,
    configPath,
    requiredPlugins,
    optionalPlugins,
    requiredBundles,
    enabledOnAnonymousPages,
    extraPublicDirs,
  };
}

/**
 * @param {unknown} build
 * @returns {import('./types').PluginPackageManifest['build']}
 */
function validatePackageManifestBuild(build) {
  if (build !== undefined && !isObj(build)) {
    throw err('build', build, 'must be an object or undefined');
  }

  if (!build) {
    return build;
  }

  const { extraExcludes, noParse, ...extra } = build;

  const extraKeys = Object.keys(extra);
  if (extraKeys.length) {
    throw new Error(`unexpected keys in "build" of package [${extraKeys.join(', ')}]`);
  }

  if (extraExcludes !== undefined && !isArrOfStrings(extraExcludes)) {
    throw err(
      `build.extraExcludes`,
      extraExcludes,
      'must be an array of non-empty strings when defined'
    );
  }

  if (noParse !== undefined && !isArrOfStrings(noParse)) {
    throw err(`build.noParse`, noParse, 'must be an array of non-empty strings when defined');
  }

  return {
    extraExcludes,
    noParse,
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

  const {
    type,
    id,
    owner,
    devOnly,
    plugin,
    sharedBrowserBundle,
    build,
    description,
    serviceFolders,
    ...extra
  } = parsed;

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

  if (description !== undefined && !isSomeString(description)) {
    throw err(`description`, description, `must be a non-empty string when specified`);
  }

  if (serviceFolders !== undefined && !isArrOfStrings(serviceFolders)) {
    throw err(`serviceFolders`, serviceFolders, `must be an array of non-empty strings`);
  }

  const base = {
    id,
    owner: Array.isArray(owner) ? owner : [owner],
    devOnly,
    build: validatePackageManifestBuild(build),
    description,
    serviceFolders,
  };

  // return if this is one of the more basic types of package types
  if (type === 'shared-server' || type === 'functional-tests' || type === 'test-helper') {
    return {
      type,
      ...base,
    };
  }

  if (type === 'plugin') {
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
      const err = new Error(`Missing kibana.jsonc file at ${path}`);
      throw Object.assign(err, { code: 'ENOENT' });
    }

    throw error;
  }

  try {
    let parsed;
    try {
      parsed = parse(content);
    } catch (error) {
      throw new Error(`Invalid JSONc: ${error.message}`);
    }

    return validatePackageManifest(parsed);
  } catch (error) {
    throw new Error(`Unable to parse [${path}]: ${error.message}`);
  }
}

module.exports = { readPackageManifest };
