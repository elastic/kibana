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

import { createReadStream } from 'fs';
import { resolve } from 'path';

import globby from 'globby';
import MultiStream from 'multistream';
import webpackMerge from 'webpack-merge';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot } from '../../../core/server/utils';
import { replacePlaceholder } from '../../../optimize/public_path_placeholder';
import findSourceFiles from './find_source_files';
import { createTestEntryTemplate } from './tests_entry_template';

export default (kibana) => {
  return new kibana.Plugin({
    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        instrument: Joi.boolean().default(false),
        pluginId: Joi.string(),
      }).default();
    },

    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      async __bundleProvider__(kbnServer) {
        const modules = new Set();

        const {
          config,
          uiApps,
          uiBundles,
          plugins,
          uiExports: { uiSettingDefaults = {} },
        } = kbnServer;

        const testGlobs = [];

        const testingPluginIds = config.get('tests_bundle.pluginId');

        if (testingPluginIds) {
          testingPluginIds.split(',').forEach((pluginId) => {
            const plugin = plugins.find((plugin) => plugin.id === pluginId);

            if (!plugin) {
              throw new Error('Invalid testingPluginId :: unknown plugin ' + pluginId);
            }

            // add the modules from all of this plugins apps
            for (const app of uiApps) {
              if (app.getPluginId() === pluginId) {
                modules.add(app.getMainModuleId());
              }
            }

            testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
          });
        } else {
          // add all since we are not just focused on specific plugins
          testGlobs.push('src/legacy/ui/public/**/*.js', '!src/legacy/ui/public/flot-charts/**/*');
          // add the modules from all of the apps
          for (const app of uiApps) {
            modules.add(app.getMainModuleId());
          }

          for (const plugin of plugins) {
            testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
          }
        }

        const testFiles = await findSourceFiles(testGlobs);
        for (const f of testFiles) modules.add(f);

        if (config.get('tests_bundle.instrument')) {
          uiBundles.addPostLoader({
            test: /\.js$/,
            exclude: /[\/\\](__tests__|node_modules|bower_components|webpackShims)[\/\\]/,
            loader: 'istanbul-instrumenter-loader',
          });
        }

        uiBundles.add({
          id: 'tests',
          modules: [...modules],
          template: createTestEntryTemplate(uiSettingDefaults),
          extendConfig(webpackConfig) {
            const mergedConfig = webpackMerge(
              {
                resolve: {
                  extensions: ['.karma_mock.js', '.karma_mock.tsx', '.karma_mock.ts'],
                },
                node: {
                  fs: 'empty',
                  child_process: 'empty',
                  dns: 'empty',
                  net: 'empty',
                  tls: 'empty',
                },
              },
              webpackConfig
            );

            /**
             * [..] it removes the commons bundle creation from the webpack
             * config when we're building the bundle for the browser tests. It
             * shouldn't be created, and by default isn't, but something is
             * triggering it in webpack which breaks the tests so if we just
             * remove the optimization config it will never happen and the tests
             * will keep working [..]
             *
             * TLDR: If you have any questions about this line, ask Spencer.
             */
            delete mergedConfig.optimization.splitChunks.cacheGroups.commons;

            return mergedConfig;
          },
        });

        kbnServer.server.route({
          method: 'GET',
          path: '/test_bundle/built_css.css',
          async handler(_, h) {
            const cssFiles = await globby(
              testingPluginIds
                ? testingPluginIds.split(',').map((id) => `built_assets/css/plugins/${id}/**/*.css`)
                : `built_assets/css/**/*.css`,
              { cwd: fromRoot('.'), absolute: true }
            );

            const stream = replacePlaceholder(
              new MultiStream(cssFiles.map((path) => createReadStream(path))),
              '/built_assets/css/'
            );

            return h.response(stream).code(200).type('text/css');
          },
        });

        // Sets global variables normally set by the bootstrap.js script
        kbnServer.server.route({
          path: '/test_bundle/karma/globals.js',
          method: 'GET',
          async handler(req, h) {
            const basePath = config.get('server.basePath');

            const file = `window.__kbnPublicPath__ = { 'kbn-ui-shared-deps': "${basePath}/bundles/kbn-ui-shared-deps/" };`;

            return h.response(file).header('content-type', 'application/json');
          },
        });
      },

      __globalImportAliases__: {
        ng_mock$: fromRoot('src/test_utils/public/ng_mock'),
        'angular-mocks$': require.resolve('./webpackShims/angular-mocks'),
        fixtures: fromRoot('src/fixtures'),
        test_utils: fromRoot('src/test_utils/public'),
      },
    },
  });
};
