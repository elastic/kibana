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
import { bindNodeCallback, from, merge } from 'rxjs';
import { catchError, filter, map, mergeMap, shareReplay } from 'rxjs/operators';
import { CoreContext } from '../../core_context';
import { Logger } from '../../logging';
import { PluginWrapper } from '../plugin';
import { createPluginInitializerContext } from '../plugin_context';
import { PluginsConfig } from '../plugins_config';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { parseManifest } from './plugin_manifest_parser';

const fsReadDir$ = bindNodeCallback(readdir);
const fsStat$ = bindNodeCallback(stat);

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
export function discover(config: PluginsConfig, coreContext: CoreContext) {
  const log = coreContext.logger.get('plugins-discovery');
  log.debug('Discovering plugins...');

  if (config.additionalPluginPaths.length) {
    log.warn(
      `Explicit plugin paths [${
        config.additionalPluginPaths
      }] are only supported in development. Relative imports will not work in production.`
    );
  }

  const discoveryResults$ = merge(
    from(config.additionalPluginPaths),
    processPluginSearchPaths$(config.pluginSearchPaths, log)
  ).pipe(
    mergeMap(pluginPathOrError => {
      return typeof pluginPathOrError === 'string'
        ? createPlugin$(pluginPathOrError, log, coreContext)
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
 * Iterates over every plugin search path and returns a merged stream of all
 * sub-directories. If directory cannot be read or it's impossible to get stat
 * for any of the nested entries then error is added into the stream instead.
 * @param pluginDirs List of the top-level directories to process.
 * @param log Plugin discovery logger instance.
 */
function processPluginSearchPaths$(pluginDirs: ReadonlyArray<string>, log: Logger) {
  return from(pluginDirs).pipe(
    mergeMap(dir => {
      log.debug(`Scanning "${dir}" for plugin sub-directories...`);

      return fsReadDir$(dir).pipe(
        mergeMap((subDirs: string[]) => subDirs.map(subDir => resolve(dir, subDir))),
        mergeMap(path =>
          fsStat$(path).pipe(
            // Filter out non-directory entries from target directories, it's expected that
            // these directories may contain files (e.g. `README.md` or `package.json`).
            // We shouldn't silently ignore the entries we couldn't get stat for though.
            mergeMap(pathStat => (pathStat.isDirectory() ? [path] : [])),
            catchError(err => [PluginDiscoveryError.invalidPluginPath(path, err)])
          )
        ),
        catchError(err => [PluginDiscoveryError.invalidSearchPath(dir, err)])
      );
    })
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
function createPlugin$(path: string, log: Logger, coreContext: CoreContext) {
  return from(parseManifest(path, coreContext.env.packageInfo)).pipe(
    map(manifest => {
      log.debug(`Successfully discovered plugin "${manifest.id}" at "${path}"`);
      return new PluginWrapper(
        path,
        manifest,
        createPluginInitializerContext(coreContext, manifest)
      );
    }),
    catchError(err => [err])
  );
}
