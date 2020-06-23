/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { readFile, stat } from 'fs';
import { resolve } from 'path';
import { coerce } from 'semver';
import { promisify } from 'util';
import { snakeCase } from 'lodash';
import { isConfigPath, PackageInfo } from '../../config';
import { Logger } from '../../logging';
import { PluginManifest } from '../types';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { isCamelCase } from './is_camel_case';

const fsReadFileAsync = promisify(readFile);
const fsStatAsync = promisify(stat);

/**
 * Name of the JSON manifest file that should be located in the plugin directory.
 */
const MANIFEST_FILE_NAME = 'kibana.json';

/**
 * The special "kibana" version can be used by the plugins to be always compatible.
 */
const ALWAYS_COMPATIBLE_VERSION = 'kibana';

/**
 * Names of the known manifest fields.
 */
const KNOWN_MANIFEST_FIELDS = (() => {
  // We use this trick to have type safety around the keys we use, if we forget to
  // add a new key here or misspell existing one, TypeScript compiler will complain.
  // We do this once at run time, so performance impact is negligible.
  const manifestFields: { [P in keyof PluginManifest]: boolean } = {
    id: true,
    kibanaVersion: true,
    version: true,
    configPath: true,
    requiredPlugins: true,
    optionalPlugins: true,
    ui: true,
    server: true,
    extraPublicDirs: true,
  };

  return new Set(Object.keys(manifestFields));
})();

/**
 * Tries to load and parse the plugin manifest file located at the provided plugin
 * directory path and produces an error result if it fails to do so or plugin manifest
 * isn't valid.
 * @param pluginPath Path to the plugin directory where manifest should be loaded from.
 * @param packageInfo Kibana package info.
 * @internal
 */
export async function parseManifest(
  pluginPath: string,
  packageInfo: PackageInfo,
  log: Logger
): Promise<PluginManifest> {
  const manifestPath = resolve(pluginPath, MANIFEST_FILE_NAME);

  let manifestContent;
  try {
    manifestContent = await fsReadFileAsync(manifestPath);
  } catch (err) {
    throw PluginDiscoveryError.missingManifest(manifestPath, err);
  }

  let manifest: Partial<PluginManifest>;
  try {
    manifest = JSON.parse(manifestContent.toString());
  } catch (err) {
    throw PluginDiscoveryError.invalidManifest(manifestPath, err);
  }

  if (!manifest || typeof manifest !== 'object') {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error('Plugin manifest must contain a JSON encoded object.')
    );
  }

  if (!manifest.id || typeof manifest.id !== 'string') {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error('Plugin manifest must contain an "id" property.')
    );
  }

  // Plugin id can be used as a config path or as a logger context and having dots
  // in there may lead to various issues, so we forbid that.
  if (manifest.id.includes('.')) {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error('Plugin "id" must not include `.` characters.')
    );
  }

  if (!isCamelCase(manifest.id)) {
    log.warn(`Expect plugin "id" in camelCase, but found: ${manifest.id}`);
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error(`Plugin manifest for "${manifest.id}" must contain a "version" property.`)
    );
  }

  if (manifest.configPath !== undefined && !isConfigPath(manifest.configPath)) {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error(
        `The "configPath" in plugin manifest for "${manifest.id}" should either be a string or an array of strings.`
      )
    );
  }

  if (
    manifest.extraPublicDirs &&
    (!Array.isArray(manifest.extraPublicDirs) ||
      !manifest.extraPublicDirs.every((dir) => typeof dir === 'string'))
  ) {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error(
        `The "extraPublicDirs" in plugin manifest for "${manifest.id}" should be an array of strings.`
      )
    );
  }

  const expectedKibanaVersion =
    typeof manifest.kibanaVersion === 'string' && manifest.kibanaVersion
      ? manifest.kibanaVersion
      : manifest.version;
  if (!isVersionCompatible(expectedKibanaVersion, packageInfo.version)) {
    throw PluginDiscoveryError.incompatibleVersion(
      manifestPath,
      new Error(
        `Plugin "${manifest.id}" is only compatible with Kibana version "${expectedKibanaVersion}", but used Kibana version is "${packageInfo.version}".`
      )
    );
  }

  const includesServerPlugin = typeof manifest.server === 'boolean' ? manifest.server : false;
  const includesUiPlugin = typeof manifest.ui === 'boolean' ? manifest.ui : false;
  if (!includesServerPlugin && !includesUiPlugin) {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error(
        `Both "server" and "ui" are missing or set to "false" in plugin manifest for "${manifest.id}", but at least one of these must be set to "true".`
      )
    );
  }

  const unknownManifestKeys = Object.keys(manifest).filter(
    (key) => !KNOWN_MANIFEST_FIELDS.has(key)
  );
  if (unknownManifestKeys.length > 0) {
    throw PluginDiscoveryError.invalidManifest(
      manifestPath,
      new Error(
        `Manifest for plugin "${manifest.id}" contains the following unrecognized properties: ${unknownManifestKeys}.`
      )
    );
  }

  return {
    id: manifest.id,
    version: manifest.version,
    kibanaVersion: expectedKibanaVersion,
    configPath: manifest.configPath || snakeCase(manifest.id),
    requiredPlugins: Array.isArray(manifest.requiredPlugins) ? manifest.requiredPlugins : [],
    optionalPlugins: Array.isArray(manifest.optionalPlugins) ? manifest.optionalPlugins : [],
    ui: includesUiPlugin,
    server: includesServerPlugin,
    extraPublicDirs: manifest.extraPublicDirs,
  };
}

/**
 * Checks whether specified folder contains Kibana new platform plugin. It's only
 * intended to be used by the legacy systems when they need to check whether specific
 * plugin path is handled by the core plugin system or not.
 * @param pluginPath Path to the plugin.
 * @internal
 */
export async function isNewPlatformPlugin(pluginPath: string) {
  try {
    return (await fsStatAsync(resolve(pluginPath, MANIFEST_FILE_NAME))).isFile();
  } catch (err) {
    return false;
  }
}

/**
 * Checks whether plugin expected Kibana version is compatible with the used Kibana version.
 * @param expectedKibanaVersion Kibana version expected by the plugin.
 * @param actualKibanaVersion Used Kibana version.
 */
function isVersionCompatible(expectedKibanaVersion: string, actualKibanaVersion: string) {
  if (expectedKibanaVersion === ALWAYS_COMPATIBLE_VERSION) {
    return true;
  }

  const coercedActualKibanaVersion = coerce(actualKibanaVersion);
  if (coercedActualKibanaVersion == null) {
    return false;
  }

  const coercedExpectedKibanaVersion = coerce(expectedKibanaVersion);
  if (coercedExpectedKibanaVersion == null) {
    return false;
  }

  // Compare coerced versions, e.g. `1.2.3` ---> `1.2.3` and `7.0.0-alpha1` ---> `7.0.0`.
  return coercedActualKibanaVersion.compare(coercedExpectedKibanaVersion) === 0;
}
