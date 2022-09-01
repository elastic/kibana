/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import { parse } from '@kbn/jsonc';
import { PluginPackageManifest, KibanaPackageManifest } from './kibana_manifest';

import {
  isObj,
  isValidId,
  isValidPkgType,
  isArrOfIds,
  isArrOfStrings,
  PACKAGE_TYPES,
} from './util';

const err = (msg: string) => new Error(msg);

function validateKibanaManifestPlugin(plugin: unknown): PluginPackageManifest['plugin'] {
  if (!isObj(plugin)) {
    throw err(`invalid package "plugin", must be an object`);
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
    throw err(`unexpected keys in "plugin" of package [${extraKeys.join(', ')}]`);
  }

  if (typeof id !== 'string' || !isValidId(id)) {
    throw err(`invalid "plugin.id", must be a string in camel or snake case`);
  }

  if (configPath !== undefined && !isArrOfIds(configPath)) {
    throw err(`invalid "plugin.configPath", must be an array of strings in camel or snake case`);
  }

  if (requiredPlugins !== undefined && !isArrOfIds(requiredPlugins)) {
    throw err(
      `invalid "plugin.requiredPlugins", must be an array of strings in camel or snake case`
    );
  }

  if (optionalPlugins !== undefined && !isArrOfIds(optionalPlugins)) {
    throw err(
      `invalid "plugin.requiredPlugins", must be an array of strings in camel or snake case`
    );
  }

  if (description !== undefined && typeof description !== 'string') {
    throw err(`invalid "plugin.description", must be a string`);
  }

  if (enabledOnAnonymousPages !== undefined && typeof enabledOnAnonymousPages !== 'boolean') {
    throw err(`invalid "plugin.enabledOnAnonymousPages", must be a boolean`);
  }

  if (serviceFolders !== undefined && !isArrOfStrings(serviceFolders)) {
    throw err(`invalid "plugin.serviceFolders", must be an array of strings`);
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
 */
export function validateKibanaManifest(parsed: unknown): KibanaPackageManifest {
  if (!isObj(parsed)) {
    throw err('expected root value to be an object');
  }

  const { type, id, owner, typeDeps, runtimeDeps, plugin, sharedBrowserBundle, ...extra } = parsed;

  const extraKeys = Object.keys(extra);
  if (extraKeys.length) {
    throw err(`unexpected keys in package manifest [${extraKeys.join(', ')}]`);
  }

  if (!isValidPkgType(type)) {
    throw err(`invalid package "type", options are [${PACKAGE_TYPES.join(', ')}]`);
  }

  if (typeof id !== 'string' || !id.startsWith('@kbn/')) {
    throw err(`invalid package "id", must be a string that starts with @kbn/`);
  }

  if (typeof owner !== 'string' || !owner.startsWith('@')) {
    throw err(`invalid package "owner", must be a valid Github team handle starting with @`);
  }

  if (!isArrOfStrings(typeDeps)) {
    throw err(`invalid "typeDeps", must be an array of strings`);
  }

  if (!isArrOfStrings(runtimeDeps)) {
    throw err(`invalid "runtimeDeps", must be an array of strings`);
  }

  const base = {
    id,
    owner,
    typeDeps,
    runtimeDeps,
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
      plugin: validateKibanaManifestPlugin(plugin),
    };
  }

  // parse the sharedBrowserBundle for shared-browser and shared-common types
  if (sharedBrowserBundle !== undefined && typeof sharedBrowserBundle !== 'boolean') {
    throw err(`invalid "sharedBrowserBundle" field, expected undefined or a boolean`);
  }
  return {
    type,
    ...base,
    sharedBrowserBundle,
  };
}

/**
 * Parse a kibana.jsonc file from the filesystem
 */
export function readKibanaManifest(path: string) {
  let content;
  try {
    content = Fs.readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw err(`Missing kibana.json file at ${path}`);
    }

    throw error;
  }

  return parseKibanaManifest(content);
}

/**
 * Parse a kibana.jsonc file from a string
 */
export function parseKibanaManifest(content: string) {
  let parsed;
  try {
    parsed = parse(content);
  } catch (error) {
    throw err(`Invalid JSONc: ${error.message}`);
  }

  return validateKibanaManifest(parsed);
}
