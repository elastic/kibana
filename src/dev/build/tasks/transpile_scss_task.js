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

import { toArray } from 'rxjs/operators';
import { buildAll } from '../../../server/sass/build_all';
import { findPluginSpecs } from '../../../plugin_discovery/find_plugin_specs';
import { collectUiExports } from '../../../ui/ui_exports/collect_ui_exports';

export const TranspileScssTask = {
  description: 'Transpiling SCSS to CSS',

  async run(config, log, build) {
    const scanDirs = [ build.resolvePath('src/legacy/core_plugins') ];
    const paths = [ build.resolvePath('node_modules/x-pack') ];

    const { spec$ } = findPluginSpecs({ plugins: { scanDirs, paths } });
    const enabledPlugins = await spec$.pipe(toArray()).toPromise();
    const uiExports = collectUiExports(enabledPlugins);

    try {
      const bundles = await buildAll(uiExports.styleSheetPaths, log, build.resolvePath('built_assets/css'));
      bundles.forEach(bundle => log.info(`Compiled SCSS: ${bundle.sourcePath} (theme=${bundle.theme})`));
    } catch (error) {
      const { message, line, file } = error;
      throw new Error(`${message} on line ${line} of ${file}`);
    }
  }
};
