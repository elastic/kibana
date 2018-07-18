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

export class Plugin {
  constructor({ dllConfig, entryPathDiscoverConfig,  log }) {
    const sanitizedLog = log || (() => {});

    this.dllCompiler = new DLLBundlerCompiler(dllConfig, sanitizedLog);
    this.entryPathDiscoverConfig = entryPathDiscoverConfig;
    this.log = sanitizedLog;
    this.nodeModulesEntryPaths = {};
  }

  apply(compiler) {
    compiler.hooks.compile.tap({
      name: 'dllBundlerBridgePlugin-buildEntryPaths',
      fn: ({ normalModuleFactory }) => {
        this.buildEntryPaths(normalModuleFactory);
      }
    });

    compiler.hooks.afterPlugins.tap({
      name: 'dllBundlerBridgePlugin-checkIfDllIsNeeded',
      fn: () => {
        console.log('sdhsadhkasdhisahdkjhsakjdhjksahdjksadjkasdjkhasjkdhaksjhdkjlhsadjkhsajkdhjksahdjksahjkdhasjkhdjk');
      }
    });

    compiler.hooks.done.tap({
      name: 'dllBundlerBridgePlugin-sendEntryPaths',
      fn: () => {
        // this.sendEntryPaths();
      }
    });

    /*compiler.hooks.shouldEmit.tap({
      name: 'dllBundlerBridgePlugin-defineNextStep',
      fn: () => {
        return false;
      }
    });

    compiler.hooks.done.tapAsync({
      name: 'dllBundlerBridgePlugin-endCycle',
      fn: (stats, cb) => {
        cb(null, stats);
      }
    });*/
  }

  buildEntryPaths(normalModuleFactory) {
    normalModuleFactory.hooks.factory.tap('NormalModuleFactory', () => (result, callback) => {
      const resolver = normalModuleFactory.hooks.resolver.call(null);

      // Ignored
      if (!resolver) return callback();

      resolver(result, (err, data) => {
        if (err) return callback(err);

        // Ignored3
        if (!data) return callback();

        // direct module
        if (typeof data.source === 'function') return callback(null, data);

        normalModuleFactory.hooks.afterResolve.callAsync(data, (err, result) => {
          if (err) return callback(err);

          // Ignored
          if (!result) return callback();

          // Build NodeModulesEntryPaths
          if (!!this.nodeModulesEntryPaths[result.request]) {
            return callback();
          }

          const nodeModulesPath = fromRoot('./node_modules');

          if (!result.request.includes('loader')
            && result.request.includes(nodeModulesPath)) {
            this.nodeModulesEntryPaths[result.request] = true;
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
