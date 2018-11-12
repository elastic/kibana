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

import { readdir, stat } from 'fs';
import { resolve } from 'path';
import { bindNodeCallback, from, merge, Observable, throwError } from 'rxjs';
import { catchError, map, mergeMap, shareReplay } from 'rxjs/operators';
import { PackageInfo } from '../../config';
import { Logger } from '../../logging';
import { PluginsConfig } from '../plugins_config';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { parseManifest, PluginManifest } from './plugin_manifest_parser';

const fsReadDir$ = bindNodeCallback(readdir);
const fsStat$ = bindNodeCallback(stat);

interface DiscoveryResult {
  plugin?: { path: string; manifest: PluginManifest };
  error?: PluginDiscoveryError;
}

/**
 * Tries to discover all possible plugins based on the provided plugin config.
 * Discovery result consists of two separate streams, the one (`plugin$`) is
 * for the successfully discovered plugins and the other one (`error$`) is for
 * all the errors that occurred during discovery process.
 *
 * @param config Plugin config instance.
 * @param packageInfo Kibana package info.
 * @param log Plugin discovery logger instance.
 */
export function discover(config: PluginsConfig, packageInfo: PackageInfo, log: Logger) {
  log.debug('Discovering plugins...');

  const discoveryResults$ = merge(
    processScanDirs$(config.scanDirs, log),
    processPaths$(config.paths, log)
  ).pipe(
    mergeMap(pluginPathOrError => {
      return typeof pluginPathOrError === 'string'
        ? createPlugin$(pluginPathOrError, packageInfo, log)
        : [pluginPathOrError];
    }),
    shareReplay()
  );

  return {
    plugin$: discoveryResults$.pipe(
      mergeMap(entry => (entry.plugin !== undefined ? [entry.plugin] : []))
    ),
    error$: discoveryResults$.pipe(
      mergeMap(entry => (entry.error !== undefined ? [entry.error] : []))
    ),
  };
}

/**
 * Iterates over every entry in `scanDirs` and returns a merged stream of all
 * sub-directories. If directory cannot be read or it's impossible to get stat
 * for any of the nested entries then error is added into the stream instead.
 * @param scanDirs List of the top-level directories to process.
 * @param log Plugin discovery logger instance.
 */
function processScanDirs$(scanDirs: string[], log: Logger) {
  return from(scanDirs).pipe(
    mergeMap(dir => {
      log.debug(`Scanning "${dir}" for plugin sub-directories...`);

      return fsReadDir$(dir).pipe(
        mergeMap(subDirs => subDirs.map(subDir => resolve(dir, subDir))),
        mergeMap(path =>
          fsStat$(path).pipe(
            // Filter out non-directory entries from target directories, it's expected that
            // these directories may contain files (e.g. `README.md` or `package.json`).
            // We shouldn't silently ignore the entries we couldn't get stat for though.
            mergeMap(pathStat => (pathStat.isDirectory() ? [path] : [])),
            catchError(err => [wrapError(PluginDiscoveryError.invalidPluginDirectory(path, err))])
          )
        ),
        catchError(err => [wrapError(PluginDiscoveryError.invalidScanDirectory(dir, err))])
      );
    })
  );
}

/**
 * Iterates over every entry in `paths` and returns a stream of all paths that
 * are directories. If path is not a directory or it's impossible to get stat
 * for this path then error is added into the stream instead.
 * @param paths List of paths to process.
 * @param log Plugin discovery logger instance.
 */
function processPaths$(paths: string[], log: Logger) {
  return from(paths).pipe(
    mergeMap(path => {
      log.debug(`Including "${path}" into the plugin path list.`);

      return fsStat$(path).pipe(
        // Since every path is specifically provided we should treat non-directory
        // entries as mistakes we should report of.
        mergeMap(pathStat => {
          return pathStat.isDirectory()
            ? [path]
            : throwError(new Error(`${path} is not a directory.`));
        }),
        catchError(err => [wrapError(PluginDiscoveryError.invalidPluginDirectory(path, err))])
      );
    })
  );
}

/**
 * Tries to load and parse the plugin manifest file located at the provided plugin
 * directory path and produces an error result if it fails to do so or plugin manifest
 * isn't valid.
 * @param path Path to the plugin directory where manifest should be loaded from.
 * @param packageInfo Kibana package info.
 * @param log Plugin discovery logger instance.
 */
function createPlugin$(
  path: string,
  packageInfo: PackageInfo,
  log: Logger
): Observable<DiscoveryResult> {
  return from(parseManifest(path, packageInfo)).pipe(
    map(manifest => {
      log.debug(`Successfully discovered plugin "${manifest.id}" at "${path}"`);
      return { plugin: { path, manifest } };
    }),
    catchError(err => [wrapError(err)])
  );
}

/**
 * Wraps `PluginDiscoveryError` into `DiscoveryResult` entry.
 * @param error Instance of the `PluginDiscoveryError` error.
 */
function wrapError(error: PluginDiscoveryError): DiscoveryResult {
  return { error };
}
