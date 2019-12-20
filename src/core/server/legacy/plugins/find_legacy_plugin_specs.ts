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

import { Observable, merge, forkJoin } from 'rxjs';
import { toArray, tap, distinct, map } from 'rxjs/operators';
import {
  findPluginSpecs,
  defaultConfig,
  // @ts-ignore
} from '../../../../legacy/plugin_discovery/find_plugin_specs.js';
import { LoggerFactory } from '../../logging';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { collectUiExports as collectLegacyUiExports } from '../../../../legacy/ui/ui_exports/collect_ui_exports';
import { LegacyConfig, LegacyConfigDeprecationProvider } from '../config';

export interface LegacyPluginPack {
  getPath(): string;
}

export interface LegacyPluginSpec {
  getId: () => unknown;
  getExpectedKibanaVersion: () => string;
  getConfigPrefix: () => string;
  getDeprecationsProvider: () => LegacyConfigDeprecationProvider | undefined;
}

export async function findLegacyPluginSpecs(settings: unknown, loggerFactory: LoggerFactory) {
  const configToMutate: LegacyConfig = defaultConfig(settings);
  const {
    pack$,
    invalidDirectoryError$,
    invalidPackError$,
    otherError$,
    deprecation$,
    invalidVersionSpec$,
    spec$,
    disabledSpec$,
  }: {
    pack$: Observable<LegacyPluginPack>;
    invalidDirectoryError$: Observable<{ path: string }>;
    invalidPackError$: Observable<{ path: string }>;
    otherError$: Observable<unknown>;
    deprecation$: Observable<{ spec: LegacyPluginSpec; message: string }>;
    invalidVersionSpec$: Observable<LegacyPluginSpec>;
    spec$: Observable<LegacyPluginSpec>;
    disabledSpec$: Observable<LegacyPluginSpec>;
  } = findPluginSpecs(settings, configToMutate) as any;

  const logger = loggerFactory.get('legacy-plugins');

  const log$ = merge(
    pack$.pipe(
      tap(definition => {
        const path = definition.getPath();
        logger.debug(`Found plugin at ${path}`, { path });
      })
    ),

    invalidDirectoryError$.pipe(
      tap(error => {
        logger.warn(`Unable to scan directory for plugins "${error.path}"`, {
          err: error,
          dir: error.path,
        });
      })
    ),

    invalidPackError$.pipe(
      tap(error => {
        logger.warn(`Skipping non-plugin directory at ${error.path}`, {
          path: error.path,
        });
      })
    ),

    otherError$.pipe(
      tap(error => {
        // rethrow unhandled errors, which will fail the server
        throw error;
      })
    ),

    invalidVersionSpec$.pipe(
      map(spec => {
        const name = spec.getId();
        const pluginVersion = spec.getExpectedKibanaVersion();
        // @ts-ignore
        const kibanaVersion = settings.pkg.version;
        return `Plugin "${name}" was disabled because it expected Kibana version "${pluginVersion}", and found "${kibanaVersion}".`;
      }),
      distinct(),
      tap(message => {
        logger.warn(message);
      })
    ),

    deprecation$.pipe(
      tap(({ spec, message }) => {
        const deprecationLogger = loggerFactory.get(
          'plugins',
          spec.getConfigPrefix(),
          'config',
          'deprecation'
        );
        deprecationLogger.warn(message);
      })
    )
  );

  const [disabledPluginSpecs, pluginSpecs] = await forkJoin(
    disabledSpec$.pipe(toArray()),
    spec$.pipe(toArray()),
    log$.pipe(toArray())
  ).toPromise();

  return {
    disabledPluginSpecs,
    pluginSpecs,
    pluginExtendedConfig: configToMutate,
    uiExports: collectLegacyUiExports(pluginSpecs),
  };
}
