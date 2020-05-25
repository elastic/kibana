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

import * as Rx from 'rxjs';
import {
  distinct,
  toArray,
  mergeMap,
  share,
  shareReplay,
  filter,
  last,
  map,
  tap,
} from 'rxjs/operators';
import { realpathSync } from 'fs';

import { Config } from '../server/config';

import { extendConfigService, disableConfigExtension } from './plugin_config';

import {
  createPack$,
  createPackageJsonAtPath$,
  createPackageJsonsInDirectory$,
} from './plugin_pack';

import { isInvalidDirectoryError, isInvalidPackError } from './errors';

export function defaultConfig(settings) {
  return Config.withDefaultSchema(settings);
}

function bufferAllResults(observable) {
  return observable.pipe(
    // buffer all results into a single array
    toArray(),
    // merge the array back into the stream when complete
    mergeMap((array) => array)
  );
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
  if (result.packageJson) {
    return realpathSync(result.packageJson.directoryPath);
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
 *  @param {ConfigService} [configToMutate] when supplied **it is mutated** to
 *  include the config from discovered plugin specs
 *  @return {Object<name,Rx>}
 */
export function findPluginSpecs(settings, configToMutate) {
  const config$ = Rx.defer(async () => {
    if (configToMutate) {
      return configToMutate;
    }

    return defaultConfig(settings);
  }).pipe(shareReplay());

  // find plugin packs in configured paths/dirs
  const packageJson$ = config$.pipe(
    mergeMap((config) =>
      Rx.merge(
        ...config.get('plugins.paths').map(createPackageJsonAtPath$),
        ...config.get('plugins.scanDirs').map(createPackageJsonsInDirectory$)
      )
    ),
    distinct(getDistinctKeyForFindResult),
    share()
  );

  const pack$ = createPack$(packageJson$).pipe(share());

  const extendConfig$ = config$.pipe(
    mergeMap((config) =>
      pack$.pipe(
        // get the specs for each found plugin pack
        mergeMap(({ pack }) => (pack ? pack.getPluginSpecs() : [])),
        // make sure that none of the plugin specs have conflicting ids, fail
        // early if conflicts detected or merge the specs back into the stream
        toArray(),
        mergeMap((allSpecs) => {
          for (const [id, specs] of groupSpecsById(allSpecs)) {
            if (specs.length > 1) {
              throw new Error(
                `Multiple plugins found with the id "${id}":\n${specs
                  .map((spec) => `  - ${id} at ${spec.getPath()}`)
                  .join('\n')}`
              );
            }
          }

          return allSpecs;
        }),
        mergeMap(async (spec) => {
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
        }),
        // extend the config with all plugins before determining enabled status
        bufferAllResults,
        map(({ spec, deprecations }) => {
          const isRightVersion = spec.isVersionCompatible(config.get('pkg.version'));
          const enabled = isRightVersion && spec.isEnabled(config);
          return {
            config,
            spec,
            deprecations,
            enabledSpecs: enabled ? [spec] : [],
            disabledSpecs: enabled ? [] : [spec],
            invalidVersionSpecs: isRightVersion ? [] : [spec],
          };
        }),
        // determine which plugins are disabled before actually removing things from the config
        bufferAllResults,
        tap((result) => {
          for (const spec of result.disabledSpecs) {
            disableConfigExtension(spec, config);
          }
        })
      )
    ),
    share()
  );

  return {
    // package JSONs found when searching configure paths
    packageJson$: packageJson$.pipe(
      mergeMap((result) => (result.packageJson ? [result.packageJson] : []))
    ),

    // plugin packs found when searching configured paths
    pack$: pack$.pipe(mergeMap((result) => (result.pack ? [result.pack] : []))),

    // errors caused by invalid directories of plugin directories
    invalidDirectoryError$: pack$.pipe(
      mergeMap((result) => (isInvalidDirectoryError(result.error) ? [result.error] : []))
    ),

    // errors caused by directories that we expected to be plugin but were invalid
    invalidPackError$: pack$.pipe(
      mergeMap((result) => (isInvalidPackError(result.error) ? [result.error] : []))
    ),

    otherError$: pack$.pipe(
      mergeMap((result) => (isUnhandledError(result.error) ? [result.error] : []))
    ),

    // { spec, message } objects produced when transforming deprecated
    // settings for a plugin spec
    deprecation$: extendConfig$.pipe(mergeMap((result) => result.deprecations)),

    // the config service we extended with all of the plugin specs,
    // only emitted once it is fully extended by all
    extendedConfig$: extendConfig$.pipe(
      mergeMap((result) => result.config),
      filter(Boolean),
      last()
    ),

    // all enabled PluginSpec objects
    spec$: extendConfig$.pipe(mergeMap((result) => result.enabledSpecs)),

    // all disabled PluginSpec objects
    disabledSpec$: extendConfig$.pipe(mergeMap((result) => result.disabledSpecs)),

    // all PluginSpec objects that were disabled because their version was incompatible
    invalidVersionSpec$: extendConfig$.pipe(mergeMap((result) => result.invalidVersionSpecs)),
  };
}

function isUnhandledError(error) {
  return error != null && !isInvalidDirectoryError(error) && !isInvalidPackError(error);
}
