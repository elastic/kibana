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

import { readFile } from 'fs';
import { resolve } from 'path';
import { bindNodeCallback, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PackageInfo } from '../../config';
import { PluginDiscoveryError } from './plugin_discovery_error';

const fsReadFile$ = bindNodeCallback(readFile);

/**
 * Describes the set of required and optional properties plugin can define in its
 * mandatory JSON manifest file.
 */
export interface PluginManifest {
  /**
   * Identifier of the plugin.
   */
  readonly id: string;

  /**
   * Version of the plugin.
   */
  readonly version: string;

  /**
   * The version of Kibana the plugin is compatible with, defaults to "version".
   */
  readonly kibanaVersion: string;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  readonly requiredPlugins: ReadonlyArray<string>;

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  readonly optionalPlugins: ReadonlyArray<string>;

  /**
   * Specifies whether plugin includes some client/browser specific functionality
   * that should be included into client bundle via `public/ui_plugin.js` file.
   */
  readonly ui: boolean;
}

/**
 * Name of the JSON manifest file that should be located in the plugin directory.
 */
const MANIFEST_FILE_NAME = 'kibana.json';

/**
 * The special "kibana" version can be used by the plugins to be always compatible.
 */
const ALWAYS_COMPATIBLE_VERSION = 'kibana';

/**
 * Regular expression used to extract semantic version part from the plugin or
 * kibana version, e.g. `1.2.3` ---> `1.2.3` and `7.0.0-alpha1` ---> `7.0.0`.
 */
const SEM_VER_REGEX = /\d+\.\d+\.\d+/;

/**
 * Tries to load and parse the plugin manifest file located at the provided plugin
 * directory path and produces an error result if it fails to do so or plugin manifest
 * isn't valid.
 * @param pluginPath Path to the plugin directory where manifest should be loaded from.
 * @param packageInfo Kibana package info.
 */
export function parseManifest$(pluginPath: string, packageInfo: PackageInfo) {
  const manifestPath = resolve(pluginPath, MANIFEST_FILE_NAME);
  return fsReadFile$(manifestPath).pipe(
    catchError(err => throwError(PluginDiscoveryError.missingManifest(manifestPath, err))),
    map(manifestContent => {
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

      if (!manifest.version || typeof manifest.version !== 'string') {
        throw PluginDiscoveryError.invalidManifest(
          manifestPath,
          new Error(`Plugin manifest for "${manifest.id}" must contain a "version" property.`)
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
            `Plugin "${
              manifest.id
            }" is only compatible with Kibana version "${expectedKibanaVersion}", but used Kibana version is "${
              packageInfo.version
            }".`
          )
        );
      }

      return {
        id: manifest.id,
        version: manifest.version,
        kibanaVersion: expectedKibanaVersion,
        requiredPlugins: Array.isArray(manifest.requiredPlugins) ? manifest.requiredPlugins : [],
        optionalPlugins: Array.isArray(manifest.optionalPlugins) ? manifest.optionalPlugins : [],
        ui: typeof manifest.ui === 'boolean' ? manifest.ui : false,
      };
    })
  );
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

  return extractSemVer(actualKibanaVersion) === extractSemVer(expectedKibanaVersion);
}

/**
 * Tries to extract semantic version part from the full version string.
 * @param version
 */
function extractSemVer(version: string) {
  const semVerMatch = version.match(SEM_VER_REGEX);
  return semVerMatch === null ? version : semVerMatch[0];
}
