import { Observable } from 'rxjs';
import { realpathSync } from 'fs';

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

function bufferAllResults(observable) {
  return observable
    // buffer all results into a single array
    .toArray()
    // merge the array back into the stream when complete
    .mergeMap(array => array);
}

/**
 * Determine a distinct value for each result from find$
 * so they can be deduplicated
 * @param  {{error?,pack?}} result
 * @return {Any}
 */
function getDistinctKeyForFindResult(result) {
  // errors are distinct by their message
  if (result.error) {
    return result.error.message;
  }

  // packs are distinct by their absolute and real path
  if (result.pack) {
    return realpathSync(result.pack.getPath());
  }

  // non error/pack results shouldn't exist, but if they do they are all unique
  return result;
}

function groupSpecsById(specs) {
  const specsById = new Map();
  for (const spec of specs) {
    const id = spec.getId();
    if (specsById.has(id)) {
      specsById.get(id).push(spec);
    } else {
      specsById.set(id, [spec]);
    }
  }
  return specsById;
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
  const find$ = Observable.merge(
    ...config.get('plugins.paths').map(createPackAtPath$),
    ...config.get('plugins.scanDirs').map(createPacksInDirectory$)
  )
    .distinct(getDistinctKeyForFindResult)
    .share();

  const extendConfig$ = find$
    // get the specs for each found plugin pack
    .mergeMap(({ pack }) => (
      pack ? pack.getPluginSpecs() : []
    ))
    // make sure that none of the plugin specs have conflicting ids, fail
    // early if conflicts detected or merge the specs back into the stream
    .toArray()
    .mergeMap(allSpecs => {
      for (const [id, specs] of groupSpecsById(allSpecs)) {
        if (specs.length > 1) {
          throw new Error(
            `Multple plugins found with the id "${id}":\n${
              specs.map(spec => `  - ${id} at ${spec.getPath()}`).join('\n')
            }`
          );
        }
      }

      return allSpecs;
    })
    .mergeMap(async (spec) => {
      // extend the config service with this plugin spec and
      // collect its deprecations messages if some of its
      // settings are outdated
      const deprecations = [];
      await extendConfigService(spec, config, settings, (message) => {
        deprecations.push({ spec, message });
      });

      return {
        spec,
        deprecations,
      };
    })
    // extend the config with all plugins before determining enabled status
    .let(bufferAllResults)
    .map(({ spec, deprecations }) => {
      const isRightVersion = spec.isVersionCompatible(config.get('pkg.version'));
      const enabled = isRightVersion && spec.isEnabled(config);
      return {
        spec,
        deprecations,
        enabledSpecs: enabled ? [spec] : [],
        disabledSpecs: enabled ? [] : [spec],
        invalidVersionSpecs: isRightVersion ? [] : [spec],
      };
    })
    // determine which plugins are disabled before actually removing things from the config
    .let(bufferAllResults)
    .do(result => {
      for (const spec of result.disabledSpecs) {
        disableConfigExtension(spec, config);
      }
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

    otherError$: find$
      .mergeMap(result => (
        isUnhandledError(result.error) ? [result.error] : []
      )),

    // { spec, message } objects produced when transforming deprecated
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

    // all disabled PluginSpec objects
    disabledSpec$: extendConfig$
      .mergeMap(result => result.disabledSpecs),

    // all PluginSpec objects that were disabled because their version was incompatible
    invalidVersionSpec$: extendConfig$
      .mergeMap(result => result.invalidVersionSpecs),
  };
}

function isUnhandledError(error) {
  return (
    error != null &&
    !isInvalidDirectoryError(error) &&
    !isInvalidPackError(error)
  );
}
