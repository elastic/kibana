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

export const TranspileScssTask = {
  description: 'Transpiling SCSS to CSS',

  async run(config, log, build) {
    const scanDirs = [ build.resolvePath('src/core_plugins') ];
    const { spec$ } = findPluginSpecs({ plugins: { scanDirs, paths: [] } });
    const enabledPlugins = await spec$.pipe(toArray()).toPromise();

    function onSuccess(builder) {
      log.info(`Compiled SCSS: ${builder.source}`);
    }

    function onError(builder, e) {
      log.error(`Compiling SCSS failed: ${builder.source}`);
      throw e;
    }

    await buildAll(enabledPlugins, { onSuccess, onError });
  }
};