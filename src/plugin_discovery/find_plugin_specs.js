import { $merge } from './utils';

import { transformDeprecations, Config } from '../server/config';

import {
  extendConfigService,
  disableConfigExtension,
} from './plugin_config';

import {
  createPackAtPath$,
  createPacksInDirectory$,
} from './plugin_pack';

import {
  isInvalidDirectoryError,
  isInvalidPackError,
} from './errors';

function defaultConfig(settings) {
  return Config.withDefaultSchema(
    transformDeprecations(settings)
  );
}

/**
 *  Creates a collection of observables for discovering pluginSpecs
 *  using Kibana's defaults, settings, and config service
 *
 *  @param {Object} settings
 *  @param {ConfigService} [config] when supplied **it is mutated** to include
 *                                  the config from discovered plugin specs
 *  @return {Object<name,Rx>}
 */
export function findPluginSpecs(settings, config = defaultConfig(settings)) {
  // find plugin packs in configured paths/dirs
  const find$ = $merge(
    ...config.get('plugins.paths').map(createPackAtPath$),
    ...config.get('plugins.scanDirs').map(createPacksInDirectory$)
  )
  .share();

  const extendConfig$ = find$
    // get the specs for each found plugin pack
    .mergeMap(({ pack }) => (
      pack ? pack.getPluginSpecs() : []
    ))
    .mergeMap(async (spec) => {
      // extend the config service with this plugin spec and
      // collect its deprecations messages if some of its
      // settings are outdated
      const deprecations = [];
      await extendConfigService(spec, config, settings, (message) => {
        deprecations.push({ spec, message });
      });

      // if the pluginSpec is disabled then disable the extension
      // we made to the config service
      const enabled = spec.isEnabled(config);
      if (!enabled) {
        disableConfigExtension(spec, config);
      }

      return {
        deprecations,
        enabledSpecs: enabled ? [spec] : [],
      };
    })
    .share();

  return {
    // plugin packs found when searching configured paths
    pack$: find$
      .mergeMap(result => (
        result.pack ? [result.pack] : []
      )),

    // errors caused by invalid directories of plugin directories
    invalidDirectoryError$: find$
      .mergeMap(result => (
        isInvalidDirectoryError(result.error) ? [result.error] : []
      )),

    // errors caused by directories that we expected to be plugin but were invalid
    invalidPackError$: find$
      .mergeMap(result => (
        isInvalidPackError(result.error) ? [result.error] : []
      )),

    // { spec, message } objects produces when transforming deprecated
    // settings for a plugin spec
    deprecation$: extendConfig$
      .mergeMap(result => result.deprecations),

    // the config service we extended with all of the plugin specs,
    // only emitted once it is fully extended by all
    extendedConfig$: extendConfig$
      .ignoreElements()
      .concat([config]),

    // all enabled PluginSpec objects
    spec$: extendConfig$
      .mergeMap(result => result.enabledSpecs),
  };
}
