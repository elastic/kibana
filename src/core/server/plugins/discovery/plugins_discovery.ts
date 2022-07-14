/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from, merge } from 'rxjs';
import { catchError, filter, map, mergeMap, concatMap, shareReplay, toArray } from 'rxjs/operators';
import { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { NodeInfo } from '@kbn/core-node-server';
import { PluginWrapper } from '../plugin';
import { createPluginInitializerContext, InstanceInfo } from '../plugin_context';
import { PluginsConfig } from '../plugins_config';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { parseManifest } from './plugin_manifest_parser';
import { scanPluginSearchPaths } from './scan_plugin_search_paths';

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
export function discover({
  config,
  coreContext,
  instanceInfo,
  nodeInfo,
}: {
  config: PluginsConfig;
  coreContext: CoreContext;
  instanceInfo: InstanceInfo;
  nodeInfo: NodeInfo;
}) {
  const log = coreContext.logger.get('plugins-discovery');
  log.debug('Discovering plugins...');

  if (config.additionalPluginPaths.length && coreContext.env.mode.dev) {
    log.warn(
      `Explicit plugin paths [${config.additionalPluginPaths}] should only be used in development. Relative imports may not work properly in production.`
    );
  }

  const discoveryResults$ = merge(
    from(config.additionalPluginPaths),
    scanPluginSearchPaths(config.pluginSearchPaths, log)
  ).pipe(
    toArray(),
    mergeMap((pathAndErrors) => {
      return pathAndErrors.sort((a, b) => {
        const pa = typeof a === 'string' ? a : a.path;
        const pb = typeof b === 'string' ? b : b.path;
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      });
    }),
    concatMap((pluginPathOrError) => {
      return typeof pluginPathOrError === 'string'
        ? createPlugin$(pluginPathOrError, log, coreContext, instanceInfo, nodeInfo)
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
 * Tries to load and parse the plugin manifest file located at the provided plugin
 * directory path and produces an error result if it fails to do so or plugin manifest
 * isn't valid.
 * @param path Path to the plugin directory where manifest should be loaded from.
 * @param log Plugin discovery logger instance.
 * @param coreContext Kibana core context.
 * @param instanceInfo Info about the instance running Kibana, including uuid.
 * @param nodeRoles Roles this process has been configured with.
 */
function createPlugin$(
  path: string,
  log: Logger,
  coreContext: CoreContext,
  instanceInfo: InstanceInfo,
  nodeInfo: NodeInfo
) {
  return from(parseManifest(path, coreContext.env.packageInfo)).pipe(
    map((manifest) => {
      log.debug(`Successfully discovered plugin "${manifest.id}" at "${path}"`);
      const opaqueId = Symbol(manifest.id);
      return new PluginWrapper({
        path,
        manifest,
        opaqueId,
        initializerContext: createPluginInitializerContext({
          coreContext,
          opaqueId,
          manifest,
          instanceInfo,
          nodeInfo,
        }),
      });
    }),
    catchError((err) => [err])
  );
}
