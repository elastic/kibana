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

import { resolve } from 'path';

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';

import { createFailError } from '@kbn/dev-utils';
import { debounce } from 'lodash';
import { findPluginSpecs } from '../../legacy/plugin_discovery';
import { collectUiExports } from '../../legacy/ui';
import { buildAll } from '../../legacy/server/sass/build_all';
import chokidar from 'chokidar';

// TODO: clintandrewhall - Extract and use FSWatcher from legacy/server/sass
const build = async ({ log, kibanaDir, styleSheetPaths, watch }) => {
  if (styleSheetPaths.length === 0) {
    return;
  }

  let bundleCount = 0;
  try {
    const bundles = await buildAll({
      styleSheets: styleSheetPaths,
      log,
      buildDir: resolve(kibanaDir, 'built_assets/css'),
      sourceMap: true,
    });

    bundles.forEach((bundle) => {
      log.debug(`Compiled SCSS: ${bundle.sourcePath} (theme=${bundle.theme})`);
    });

    bundleCount = bundles.length;
  } catch (error) {
    const { message, line, file } = error;
    throw createFailError(`${message} on line ${line} of ${file}`);
  }

  log.success('%d scss bundles %s', bundleCount, watch ? 'rebuilt' : 'created');
};

export async function buildSass({ log, kibanaDir, watch }) {
  log.info('running plugin discovery in', kibanaDir);

  const scanDirs = [resolve(kibanaDir, 'src/legacy/core_plugins')];
  const paths = [resolve(kibanaDir, 'x-pack')];
  const { spec$, disabledSpec$ } = findPluginSpecs({ plugins: { scanDirs, paths } });
  const allPlugins = await Rx.merge(spec$, disabledSpec$).pipe(toArray()).toPromise();
  const uiExports = collectUiExports(allPlugins);
  const { styleSheetPaths } = uiExports;

  log.info('%s %d styleSheetPaths', watch ? 'watching' : 'found', styleSheetPaths.length);
  log.verbose(styleSheetPaths);

  if (watch) {
    const debouncedBuild = debounce(async (path) => {
      let buildPaths = styleSheetPaths;
      if (path) {
        buildPaths = styleSheetPaths.filter((styleSheetPath) =>
          path.includes(styleSheetPath.urlImports.publicDir)
        );
      }
      await build({ log, kibanaDir, styleSheetPaths: buildPaths, watch });
    });

    const watchPaths = styleSheetPaths.map((styleSheetPath) => styleSheetPath.urlImports.publicDir);

    await build({ log, kibanaDir, styleSheetPaths });

    chokidar.watch(watchPaths, { ignoreInitial: true }).on('all', (_, path) => {
      debouncedBuild(path);
    });
  } else {
    await build({ log, kibanaDir, styleSheetPaths });
  }
}
