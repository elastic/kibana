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
import { bindNodeCallback, from, merge, Observable } from 'rxjs';
import { catchError, filter, map, mergeMap, shareReplay } from 'rxjs/operators';
import { CoreContext } from '../../core_context';
import { Logger } from '../../logging';
import { PluginWrapper } from '../plugin';
import { createPluginInitializerContext, InstanceInfo } from '../plugin_context';
import { PluginsConfig } from '../plugins_config';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { parseManifest } from './plugin_manifest_parser';

const fsReadDir$ = bindNodeCallback<string, string[]>(readdir);
const fsStat$ = bindNodeCallback(stat);

const maxScanDepth = 5;

interface PluginSearchPathEntry {
  dir: string;
  depth: number;
}

/**
 * Tries to discover all possible plugins based on the provided plugin config.
 * Discovery result consists of two separate streams, the one (`plugin$`) is
 * for the successfully discovered plugins and the other one (`error$`) is for
 * all the errors that occurred during discovery process.
 *
 * @param config Plugin config instance.
 * @param coreContext Kibana core values.
 * @internal
 */
export function discover(
  config: PluginsConfig,
  coreContext: CoreContext,
  instanceInfo: InstanceInfo
) {
  const log = coreContext.logger.get('plugins-discovery');
  log.debug('Discovering plugins...');

  if (config.additionalPluginPaths.length && coreContext.env.mode.dev) {
    log.warn(
      `Explicit plugin paths [${config.additionalPluginPaths}] should only be used in development. Relative imports may not work properly in production.`
    );
  }

  const discoveryResults$ = merge(
    from(config.additionalPluginPaths),
    processPluginSearchPaths$(config.pluginSearchPaths, log)
  ).pipe(
    mergeMap((pluginPathOrError) => {
      return typeof pluginPathOrError === 'string'
        ? createPlugin$(pluginPathOrError, log, coreContext, instanceInfo)
        : [pluginPathOrError];
    }),
    shareReplay()
  );

  return {
    plugin$: discoveryResults$.pipe(
      filter((entry): entry is PluginWrapper => entry instanceof PluginWrapper)
    ),
    error$: discoveryResults$.pipe(
      filter((entry): entry is PluginDiscoveryError => !(entry instanceof PluginWrapper))
    ),
  };
}

/**
 * Recursively iterates over every plugin search path and returns a merged stream of all
 * sub-directories containing a manifest file. If directory cannot be read or it's impossible to get stat
 * for any of the nested entries then error is added into the stream instead.
 *
 * @param pluginDirs List of the top-level directories to process.
 * @param log Plugin discovery logger instance.
 */
function processPluginSearchPaths$(
  pluginDirs: readonly string[],
  log: Logger
): Observable<string | PluginDiscoveryError> {
  function recursiveScanFolder(
    ent: PluginSearchPathEntry
  ): Observable<string | PluginDiscoveryError> {
    return from([ent]).pipe(
      mergeMap((entry) => {
        return findManifestInFolder(entry.dir, () => {
          if (entry.depth > maxScanDepth) {
            return [];
          }
          return mapSubdirectories(entry.dir, (subDir) =>
            recursiveScanFolder({ dir: subDir, depth: entry.depth + 1 })
          );
        });
      })
    );
  }

  return from(pluginDirs.map((dir) => ({ dir, depth: 0 }))).pipe(
    mergeMap((entry) => {
      log.debug(`Scanning "${entry.dir}" for plugin sub-directories...`);
      return fsReadDir$(entry.dir).pipe(
        mergeMap(() => recursiveScanFolder(entry)),
        catchError((err) => [PluginDiscoveryError.invalidSearchPath(entry.dir, err)])
      );
    })
  );
}

/**
 * Attempts to read manifest file in specified directory or calls `notFound` and returns results if not found. For any
 * manifest files that cannot be read, a PluginDiscoveryError is added.
 * @param dir
 * @param notFound
 */
function findManifestInFolder(
  dir: string,
  notFound: () => never[] | Observable<string | PluginDiscoveryError>
): string[] | Observable<string | PluginDiscoveryError> {
  return fsStat$(resolve(dir, 'kibana.json')).pipe(
    mergeMap((stats) => {
      // `kibana.json` exists in given directory, we got a plugin
      if (stats.isFile()) {
        return [dir];
      }
      return [];
    }),
    catchError((manifestStatError) => {
      // did not find manifest. recursively process sub directories until we reach max depth.
      if (manifestStatError.code !== 'ENOENT') {
        return [PluginDiscoveryError.invalidPluginPath(dir, manifestStatError)];
      }
      return notFound();
    })
  );
}

/**
 * Finds all subdirectories in `dir` and executed `mapFunc` for each one. For any directories that cannot be read,
 * a PluginDiscoveryError is added.
 * @param dir
 * @param mapFunc
 */
function mapSubdirectories(
  dir: string,
  mapFunc: (subDir: string) => Observable<string | PluginDiscoveryError>
): Observable<string | PluginDiscoveryError> {
  return fsReadDir$(dir).pipe(
    mergeMap((subDirs: string[]) => subDirs.map((subDir) => resolve(dir, subDir))),
    mergeMap((subDir) =>
      fsStat$(subDir).pipe(
        mergeMap((pathStat) => (pathStat.isDirectory() ? mapFunc(subDir) : [])),
        catchError((subDirStatError) => [
          PluginDiscoveryError.invalidPluginPath(subDir, subDirStatError),
        ])
      )
    )
  );
}

/**
 * Tries to load and parse the plugin manifest file located at the provided plugin
 * directory path and produces an error result if it fails to do so or plugin manifest
 * isn't valid.
 * @param path Path to the plugin directory where manifest should be loaded from.
 * @param log Plugin discovery logger instance.
 * @param coreContext Kibana core context.
 */
function createPlugin$(
  path: string,
  log: Logger,
  coreContext: CoreContext,
  instanceInfo: InstanceInfo
) {
  return from(parseManifest(path, coreContext.env.packageInfo, log)).pipe(
    map((manifest) => {
      log.debug(`Successfully discovered plugin "${manifest.id}" at "${path}"`);
      const opaqueId = Symbol(manifest.id);
      return new PluginWrapper({
        path,
        manifest,
        opaqueId,
        initializerContext: createPluginInitializerContext(
          coreContext,
          opaqueId,
          manifest,
          instanceInfo
        ),
      });
    }),
    catchError((err) => [err])
  );
}
