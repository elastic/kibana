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
import { map, distinct, toArray, tap, mergeMap } from 'rxjs/operators';

import { resolve } from 'path';
import { readdir, existsSync } from 'fs';
import { promisify } from 'util';
import { i18nLoader, i18n } from '@kbn/i18n';

import { findPluginSpecs } from '../../plugin_discovery';
import { Plugin } from './lib';


const readdirAsync = promisify(readdir);

export async function scanMixin(kbnServer, server, config) {
  const {
    pack$,
    invalidDirectoryError$,
    invalidPackError$,
    otherError$,
    deprecation$,
    invalidVersionSpec$,
    spec$,
    disabledSpec$,
    translationPath$,
  } = findPluginSpecs(kbnServer.settings, config);

  const logging$ = Rx.merge(
    pack$.pipe(
      tap(definition => {
        server.log(['plugin', 'debug'], {
          tmpl: 'Found plugin at <%= path %>',
          path: definition.getPath()
        });
      })
    ),

    invalidDirectoryError$.pipe(
      tap(error => {
        server.log(['plugin', 'warning'], {
          tmpl: '<%= err.code %>: Unable to scan directory for plugins "<%= dir %>"',
          err: error,
          dir: error.path
        });
      })
    ),

    invalidPackError$.pipe(
      tap(error => {
        server.log(['plugin', 'warning'], {
          tmpl: 'Skipping non-plugin directory at <%= path %>',
          path: error.path
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
        const kibanaVersion = config.get('pkg.version');
        return `Plugin "${name}" was disabled because it expected Kibana version "${pluginVersion}", and found "${kibanaVersion}".`;
      }),
      distinct(),
      tap(message => {
        server.log(['plugin', 'warning'], message);
      })
    ),

    deprecation$.pipe(
      tap(({ spec, message }) => {
        server.log(['warning', spec.getConfigPrefix(), 'config', 'deprecation'], message);
      })
    )
  );

  const enabledSpecs$ = spec$.pipe(
    toArray(),
    tap(specs => {
      kbnServer.pluginSpecs = specs;
    })
  );

  const disabledSpecs$ = disabledSpec$.pipe(
    toArray(),
    tap(specs => {
      kbnServer.disabledPluginSpecs = specs;
    })
  );

  await translationPath$.pipe(
    mergeMap(async (paths) => {
      const translationPaths = [];

      for (const pluginPath of paths) {
        const translationsDir = resolve(pluginPath, 'translations');

        if (!existsSync(translationsDir)) {
          continue;
        }

        const translations = (await readdirAsync(translationsDir) || [])
          .filter(filePath => filePath.endsWith('.json'))
          .map(filePath => resolve(translationsDir, filePath));

        translationPaths.push(...translations);
      }

      i18nLoader.registerTranslationFiles(translationPaths);

      const locale = config.get('i18n.locale');
      const pureTranslations = await i18nLoader.getTranslationsByLocale(locale);

      const translations = Object.freeze({
        locale,
        ...pureTranslations,
      });

      i18n.init(translations);
      server.decorate('server', 'getUiTranslations', () => translations);
    })
  ).toPromise();

  // await completion of enabledSpecs$, disabledSpecs$, and logging$
  await Rx.merge(logging$, enabledSpecs$, disabledSpecs$).toPromise();

  kbnServer.plugins = kbnServer.pluginSpecs.map(spec => (
    new Plugin(kbnServer, spec)
  ));
}
