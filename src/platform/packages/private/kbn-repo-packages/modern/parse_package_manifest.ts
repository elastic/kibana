/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { inspect } from 'util';

import {
  isSomeString,
  isObj,
  isValidPluginId,
  isValidPkgType,
  isArrOfIds,
  isArrOfStrings,
  PACKAGE_TYPES,
} from './parse_helpers';
import { getGitRepoRootSync } from './get_git_repo_root';
import { parse } from '../utils/jsonc';
import { isValidPluginCategoryInfo, PLUGIN_CATEGORY } from './plugin_category_info';

const err = (key: string, value: unknown, msg: string): Error => {
  const dbg = ['string', 'number', 'boolean', 'undefined'].includes(typeof value)
    ? value
    : inspect(value);
  return new Error(`invalid package "${key}" [${dbg}], ${msg}`);
};

const isValidOwner = (v: unknown): v is string => typeof v === 'string' && v.startsWith('@');

function validatePackageManifestPlugin(plugin: unknown, repoRoot: string, path: string): any {
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
    runtimePluginDependencies,
    enabledOnAnonymousPages,
    type,
    __category__,
  } = plugin as any;

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

  if (runtimePluginDependencies !== undefined && !isArrOfIds(runtimePluginDependencies)) {
    throw err(
      `plugin.runtimePluginDependencies`,
      runtimePluginDependencies,
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

  const segs = path.split(Path.sep);
  const gitRepoRoot = getGitRepoRootSync(repoRoot);
  const isBuild =
    segs.includes('node_modules') ||
    (gitRepoRoot && path.startsWith(Path.join(gitRepoRoot, 'build', 'kibana')));
  // TODO: evaluate if __category__ should be removed
  if (__category__ !== undefined) {
    if (!isBuild) {
      throw err(
        'plugin.__category__',
        __category__,
        'may only be specified on built packages in node_modules'
      );
    }

    if (!isValidPluginCategoryInfo(__category__)) {
      throw err('plugin.__category__', __category__, 'is not valid');
    }
  } else if (isBuild) {
    throw err(
      'plugin.__category__',
      __category__,
      'must be defined on built packages in node_modules'
    );
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
    runtimePluginDependencies,
    enabledOnAnonymousPages,
    extraPublicDirs,
    [PLUGIN_CATEGORY]: __category__,
  };
}

function validatePackageManifestBuild(build: unknown): any {
  if (build !== undefined && !isObj(build)) {
    throw err('build', build, 'must be an object or undefined');
  }

  if (!build) {
    return build;
  }

  const { extraExcludes, noParse, ...extra } = build as any;

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

function validatePackageManifest(parsed: unknown, repoRoot: string, path: string): any {
  if (!isObj(parsed)) {
    throw new Error('expected manifest root to be an object');
  }

  const {
    type,
    id,
    owner,
    group,
    visibility,
    devOnly,
    build,
    description,
    serviceFolders,
    ...extra
  } = parsed as any;

  const { plugin, sharedBrowserBundle } = parsed as any;

  const extraKeys = Object.keys(extra).filter(
    (key: string) => !['plugin', 'sharedBrowserBundle'].includes(key)
  );
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

  // BOOKMARK - List of Kibana Solutions
  if (
    group !== undefined &&
    (!isSomeString(group) ||
      !['platform', 'search', 'security', 'observability', 'workplaceai'].includes(group))
  ) {
    throw err(
      `plugin.group`,
      group,
      `must have a valid value ("platform" | "search" | "security" | "observability" | "workplaceai")`
    );
  }

  if (
    visibility !== undefined &&
    (!isSomeString(visibility) || !['private', 'shared'].includes(visibility))
  ) {
    throw err(`plugin.visibility`, visibility, `must have a valid value ("private" | "shared")`);
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
    group,
    visibility,
    devOnly,
    build: validatePackageManifestBuild(build),
    description,
    serviceFolders,
  };

  // return if this is one of the more basic types of package types
  if (
    type === 'shared-server' ||
    type === 'functional-tests' ||
    type === 'test-helper' ||
    type === 'core'
  ) {
    return {
      type,
      ...base,
    };
  }

  if (type === 'plugin') {
    return {
      type,
      ...base,
      plugin: validatePackageManifestPlugin(plugin, repoRoot, path),
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

function readPackageManifest(repoRoot: string, path: string): any {
  let content: string;
  try {
    content = Fs.readFileSync(path, 'utf8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const e = new Error(`Missing kibana.jsonc file at ${path}`);
      throw Object.assign(e, { code: 'ENOENT' });
    }

    throw error;
  }

  try {
    let parsed: any;
    try {
      parsed = parse(content);
    } catch (error: any) {
      throw new Error(`Invalid JSONc: ${error.message}`);
    }

    return validatePackageManifest(parsed, repoRoot, path);
  } catch (error: any) {
    throw new Error(`Unable to parse [${path}]: ${error.message}`);
  }
}

export { readPackageManifest };
