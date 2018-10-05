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

import { readdir, readFile, stat } from 'fs';
import { resolve } from 'path';
import { bindNodeCallback, from, merge, Observable, throwError } from 'rxjs';
import { catchError, mergeMap, shareReplay } from 'rxjs/operators';
import { Logger } from '../logging';
import { PluginDiscoveryError, PluginDiscoveryErrorType } from './plugin_discovery_error';
import { PluginsConfig } from './plugins_config';

const fsReadDir$ = bindNodeCallback(readdir);
const fsStat$ = bindNodeCallback(stat);
const fsReadFile$ = bindNodeCallback(readFile);

/**
 * Describes the set of required and optional properties plugin can define in its
 * mandatory JSON manifest file.
 */
interface PluginManifest {
  /**
   * Identifier of the plugin.
   */
  id: string;

  /**
   * Version of the plugin.
   */
  version: string;

  /**
   * The version of Kibana the plugin is compatible with, defaults to "version".
   */
  kibanaVersion?: string;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  requiredPlugins?: string[];

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  optionalPlugins?: string[];

  /**
   * Specifies whether plugin includes some client/browser specific functionality
   * that should be included into client bundle via `public/ui_plugin.js` file.
   */
  ui?: boolean;
}

interface DiscoveryResult {
  plugin?: { path: string; manifest: PluginManifest };
  error?: PluginDiscoveryError;
}

/**
 * Name of the JSON manifest file that should be located in the plugin directory.
 */
const MANIFEST_FILE_NAME = 'kibana.json';

/**
 * This class is responsible for discovering all recognizable plugins based on the
 * provided plugin config that defines top-level directories for groups of plugins
 * or/and direct paths to specific plugins.
 */
export class PluginsDiscovery {
  constructor(private readonly log: Logger) {}

  /**
   * Tries to discover all possible plugins based on the provided plugin config.
   * Discovery result consists of two separate streams, the one (`plugins$`) is
   * for the successfully discovered plugins and the other one (`errors$`) is for
   * all the errors that occurred during discovery process.
   * @param config$ Plugin config instance.
   */
  public discover(config$: Observable<PluginsConfig>) {
    this.log.debug('Discovering plugins...');

    const discoveryResults$ = config$.pipe(
      mergeMap(config =>
        merge(this.processScanDirs$(config.scanDirs), this.processPaths$(config.paths))
      ),
      mergeMap(pluginPathOrError => {
        return typeof pluginPathOrError === 'string'
          ? this.createPlugin$(pluginPathOrError)
          : [pluginPathOrError];
      }),
      shareReplay()
    );

    return {
      plugins$: discoveryResults$.pipe(
        mergeMap(entry => (entry.plugin !== undefined ? [entry.plugin] : []))
      ),
      errors$: discoveryResults$.pipe(
        mergeMap(entry => (entry.error !== undefined ? [entry.error] : []))
      ),
    };
  }

  /**
   * Iterates over every entry in `scanDirs` and returns a merged stream of all
   * sub-directories. If directory cannot be read or it's impossible to get stat
   * for any of the nested entries then error is added into the stream instead.
   * @param scanDirs List of the top-level directories to process.
   */
  private processScanDirs$(scanDirs: string[]) {
    return from(scanDirs).pipe(
      mergeMap(dir => {
        this.log.debug(`Scanning "${dir}" for plugin sub-directories...`);

        return fsReadDir$(dir).pipe(
          mergeMap(subDirs => subDirs.map(subDir => resolve(dir, subDir))),
          mergeMap(path =>
            fsStat$(path).pipe(
              // Filter out non-directory entries from target directories, it's expected that
              // these directories may contain files (e.g. `README.md` or `package.json`).
              // We shouldn't silently ignore the entries we couldn't get stat for though.
              mergeMap(pathStat => (pathStat.isDirectory() ? [path] : [])),
              catchError(err => [
                wrapError(PluginDiscoveryErrorType.InvalidPluginDirectory, path, err),
              ])
            )
          ),
          catchError(err => [wrapError(PluginDiscoveryErrorType.InvalidScanDirectory, dir, err)])
        );
      })
    );
  }

  /**
   * Iterates over every entry in `paths` and returns a stream of all paths that
   * are directories. If path is not a directory or it's impossible to get stat
   * for this path then error is added into the stream instead.
   * @param paths List of paths to process.
   */
  private processPaths$(paths: string[]) {
    return from(paths).pipe(
      mergeMap(path => {
        this.log.debug(`Including "${path}" into the plugin path list.`);

        return fsStat$(path).pipe(
          // Since every path is specifically provided we should treat non-directory
          // entries as mistakes we should report of.
          mergeMap(pathStat => {
            return pathStat.isDirectory()
              ? [path]
              : throwError(new Error(`${path} is not a directory.`));
          }),
          catchError(err => [wrapError(PluginDiscoveryErrorType.InvalidPluginDirectory, path, err)])
        );
      })
    );
  }

  /**
   * Tries to load and parse the plugin manifest file located at the provided
   * plugin directory path and throws if it fails to do so or plugin manifest
   * isn't valid.
   * @param path Path to the plugin directory where manifest should be loaded from.
   */
  private createPlugin$(path: string) {
    const manifestPath = resolve(path, MANIFEST_FILE_NAME);
    return fsReadFile$(manifestPath).pipe(
      mergeMap(manifestContent => {
        try {
          const plugin = { path, manifest: parseManifest(manifestContent) };

          this.log.debug(`Successfully discovered plugin "${plugin.manifest.id}" at "${path}"`);

          return [{ plugin }];
        } catch (err) {
          return [wrapError(PluginDiscoveryErrorType.InvalidManifest, manifestPath, err)];
        }
      }),
      catchError(err => [wrapError(PluginDiscoveryErrorType.MissingManifest, manifestPath, err)])
    );
  }
}

/**
 * Parses raw buffer content into plugin manifest with the preliminary checks.
 * @param rawManifest Buffer containing plugin manifest JSON.
 */
function parseManifest(rawManifest: Buffer): PluginManifest {
  const manifest = JSON.parse(rawManifest.toString());
  if (
    manifest.id &&
    manifest.version &&
    typeof manifest.id === 'string' &&
    typeof manifest.version === 'string'
  ) {
    return manifest;
  }

  throw new Error('The "id" or/and "version" is missing in the plugin manifest.');
}

/**
 * Wraps any error instance into `PluginDiscoveryError` tagging it with specific
 * type that can be used later to distinguish between different types of errors
 * that can occur during plugin discovery process.
 * @param type Type of the discovery error (invalid directory, invalid manifest etc.)
 * @param path Path at which discovery error occurred.
 * @param error Instance of the "raw" error that occurred during discovery.
 */
function wrapError(type: PluginDiscoveryErrorType, path: string, error: Error): DiscoveryResult {
  return { error: new PluginDiscoveryError(type, path, error) };
}
