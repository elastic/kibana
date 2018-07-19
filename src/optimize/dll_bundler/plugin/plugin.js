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

import NormalModule from 'webpack/lib/NormalModule';
import { fromRoot } from '../../../utils';
import { DLLBundlerCompiler } from '../compiler';
import webpack from 'webpack';
import path from 'path';
import { remove } from 'lodash';

export class Plugin {
  constructor({ dllConfig, log }) {
    this.dllConfig = dllConfig;
    this.log = log || (() => {});

    this.dllCompiler = new DLLBundlerCompiler(this.dllConfig, this.log);
    this.entryPathsCompiler = null;
    this.entryPaths = {};
  }

  apply(compiler) {
    this.referenceDLLs(compiler);

    compiler.hooks.watchRun.tapAsync({
      name: 'dllBundlerBridgePlugin-checkIfDllIsNeeded',
      fn: async (a, cb) => {
        await this.runEntryPathsCompiler(compiler.options);
        await this.runDLLsCompiler();

        cb();
      }
    });
  }

  async runEntryPathsCompiler(mainCompilerConfig) {
    return new Promise((resolve) => {
      // Filter out this own plugin from the main compiler
      // config to avoid exceed max stack size
      remove(mainCompilerConfig.plugins, (plugin) => {
        return plugin === this;
      });

      this.entryPathsCompiler = webpack(mainCompilerConfig);

      this.entryPathsCompiler.hooks.compile.tap({
        name: 'dllBundlerBridgePlugin-buildEntryPaths-start',
        fn: ({ normalModuleFactory }) => {
          this.buildEntryPaths(normalModuleFactory);
        }
      });

      this.entryPathsCompiler.hooks.done.tap({
        name: 'dllBundlerBridgePlugin-buildEntryPaths-done',
        fn: () => {
          this.entryPathsCompiler = null;
        }
      });

      this.entryPathsCompiler.run(() => {
        resolve();
      });
    });
  }

  async runDLLsCompiler() {
    this.dllCompiler = new DLLBundlerCompiler(this.dllConfig, this.log);
    this.dllCompiler.upsertDllEntryFile(Object.keys(this.entryPaths));
    await this.dllCompiler.run();
  }

  referenceDLLs(mainCompiler) {
    this.dllConfig.dllEntries.forEach((entry) => {
      new webpack.DllReferencePlugin({
        context: this.dllConfig.context,
        manifest: require.resolve(`${this.dllConfig.outputPath}/${entry.name}.json`),
      }).apply(mainCompiler);
    });
  }

  buildEntryPaths(normalModuleFactory) {
    normalModuleFactory.hooks.factory.tap('NormalModuleFactory', () => (result, callback) => {
      const resolver = normalModuleFactory.hooks.resolver.call(null);

      // Ignored
      if (!resolver) return callback();

      resolver(result, (err, data) => {
        if (err) return callback(err);

        // Ignored
        if (!data) return callback();

        // direct module
        if (typeof data.source === 'function') return callback(null, data);

        normalModuleFactory.hooks.afterResolve.callAsync(data, (err, result) => {
          if (err) return callback(err);

          // Ignored
          if (!result) return callback();

          // Build NodeModules EntryPaths
          if (!!this.entryPaths[result.request]) {
            return callback();
          }

          const nodeModulesPath = fromRoot('./node_modules');

          if (!result.request.includes('loader')
            && result.request.includes(nodeModulesPath)) {
            // TODO: Improve the way we build relative path for result.request
            const relativeRequestPath = result.request.replace(`${fromRoot('.')}/`, '../../../');
            const normalizedRequestPath = path.normalize(relativeRequestPath);

            this.entryPaths[normalizedRequestPath] = true;
          }

          let createdModule = normalModuleFactory.hooks.createModule.call(result);
          if (!createdModule) {
            if (!result.request) {
              return callback(new Error('Empty dependency (no request)'));
            }

            createdModule = new NormalModule(result);
          }

          createdModule = normalModuleFactory.hooks.module.call(createdModule, result);

          return callback(null, createdModule);
        });
      });
    });
  }
}
