/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from, merge, EMPTY } from 'rxjs';
import { catchError, filter, map, mergeMap, concatMap, shareReplay, toArray } from 'rxjs';
import { Logger } from '@kbn/logging';
import { getPluginPackagesFilter } from '@kbn/repo-packages';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { NodeInfo } from '@kbn/core-node-server';
import { PluginWrapper } from '../plugin';
import { pluginManifestFromPluginPackage } from './plugin_manifest_from_plugin_package';
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

  const fsDiscovery$ = merge(
    from(config.additionalPluginPaths),
    scanPluginSearchPaths(config.pluginSearchPaths, log)
  ).pipe(
    concatMap((pluginPathOrError) => {
      return typeof pluginPathOrError === 'string'
        ? createPlugin$(pluginPathOrError, log, coreContext, instanceInfo, nodeInfo)
        : [pluginPathOrError];
    })
  );

  const pluginPkgDiscovery$ = from(coreContext.env.repoPackages ?? EMPTY).pipe(
    filter(
      getPluginPackagesFilter({
        oss: coreContext.env.cliArgs.oss,
        examples: coreContext.env.cliArgs.runExamples,
        paths: config.additionalPluginPaths,
        parentDirs: config.pluginSearchPaths,
      })
    ),
    map((pkg) => {
      log.debug(`Successfully discovered plugin package "${pkg.id}"`);
      const manifest = pluginManifestFromPluginPackage(
        coreContext.env.packageInfo.version,
        pkg.manifest
      );
      const initializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId: Symbol(pkg.id),
        manifest,
        instanceInfo,
        nodeInfo,
      });

      return new PluginWrapper({
        path: pkg.directory,
        manifest,
        opaqueId: initializerContext.opaqueId,
        initializerContext,
      });
    })
  );

  const discoveryResults$ = merge(fsDiscovery$, pluginPkgDiscovery$).pipe(
    toArray(),
    // ensure that everything is always provided in a consistent order
    mergeMap((pkgs) =>
      pkgs.sort((a, b) => {
        const aComp = typeof a !== 'string' ? a.path : a;
        const bComp = typeof b !== 'string' ? b.path : b;
        return aComp.localeCompare(bComp);
      })
    ),
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
