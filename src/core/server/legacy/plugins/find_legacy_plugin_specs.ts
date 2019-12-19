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
import { LegacyConfig } from '../config';
import { LegacyUiExports, LegacyNavLink, LegacyPluginSpec, LegacyPluginPack } from '../types';

const REMOVE_FROM_ARRAY: any[] = [];

function getUiApps({ uiAppSpecs = [] }: LegacyUiExports, pluginSpecs: LegacyPluginSpec[]) {
  return uiAppSpecs.flatMap(spec => {
    if (!spec) {
      return REMOVE_FROM_ARRAY;
    }

    const id = spec.pluginId || spec.id;

    if (!id) {
      throw new Error('Every app must specify an id');
    }

    if (spec.pluginId && !pluginSpecs.some(plugin => plugin.getId() === spec.pluginId)) {
      throw new Error(`Unknown plugin id "${spec.pluginId}"`);
    }

    const listed = typeof spec.listed === 'boolean' ? spec.listed : true;

    if (spec.hidden || !listed) {
      return REMOVE_FROM_ARRAY;
    }

    return {
      id,
      title: spec.title,
      order: typeof spec.order === 'number' ? spec.order : 0,
      icon: spec.icon,
      euiIconType: spec.euiIconType,
      url: spec.url || `/app/${id}`,
      linkToLastSubUrl: spec.linkToLastSubUrl,
    };
  });
}

function getNavLinks(uiExports: LegacyUiExports, pluginSpecs: LegacyPluginSpec[]) {
  const navLinkSpecs = uiExports.navLinkSpecs || [];
  const navLinks = navLinkSpecs.map<LegacyNavLink>(spec => ({
    id: spec.id,
    title: spec.title,
    order: typeof spec.order === 'number' ? spec.order : 0,
    url: spec.url,
    subUrlBase: spec.subUrlBase || spec.url,
    icon: spec.icon,
    euiIconType: spec.euiIconType,
    linkToLastSub: 'linkToLastSubUrl' in spec ? spec.linkToLastSubUrl : false,
    hidden: 'hidden' in spec ? spec.hidden : false,
    disabled: 'disabled' in spec ? spec.disabled : false,
    tooltip: spec.tooltip || '',
  }));

  return [...navLinks, ...getUiApps(uiExports, pluginSpecs)].sort((a, b) => a.order - b.order);
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
  const uiExports = collectLegacyUiExports(pluginSpecs);
  const navLinks = getNavLinks(uiExports, pluginSpecs);

  return {
    disabledPluginSpecs,
    pluginSpecs,
    pluginExtendedConfig: configToMutate,
    uiExports,
    navLinks,
  };
}
