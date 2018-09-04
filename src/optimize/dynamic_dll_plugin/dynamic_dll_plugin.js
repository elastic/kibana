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

import { DllCompiler } from './dll_compiler';
import { IS_KIBANA_DISTRIBUTABLE } from '../../utils';
import RawModule from 'webpack/lib/RawModule';
import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const realPathAsync = promisify(fs.realpath);
const DLL_ENTRY_STUB_MODULE_TYPE = 'javascript/dll-entry-stub';

function inNodeModules(checkPath) {
  return checkPath.includes(`${path.sep}node_modules${path.sep}`);
}

function inPluginNodeModules(checkPath) {
  return checkPath.match(/[\/\\]plugins.*[\/\\]node_modules/);
}

export class DynamicDllPlugin {
  constructor({ uiBundles, log }) {
    this.log = log || (() => null);
    this.dllCompiler = new DllCompiler(uiBundles, log);
    this.entryPaths = '';
    this.afterCompilationEntryPaths = '';
  }

  async init() {
    await this.dllCompiler.init();
    this.entryPaths = await this.dllCompiler.readEntryFile();
    this.log(['info', 'optimize:dynamic_dll_plugin'], 'Started dynamic dll plugin tasks');
  }

  apply(compiler) {
    this.registerHooks(compiler);
    this.bindDllReferencePlugin(compiler);
  }

  bindDllReferencePlugin(compiler) {
    const rawDllConfig = this.dllCompiler.rawDllConfig;
    const dllContext = rawDllConfig.context;
    const dllManifestPath = this.dllCompiler.getManifestPath();

    new webpack.DllReferencePlugin({
      context: dllContext,
      manifest: dllManifestPath,
    }).apply(compiler);
  }

  registerHooks(compiler) {
    this.registerRunHook(compiler);
    this.registerWatchRunHook(compiler);
    this.registerBeforeCompileHook(compiler);
    this.registerCompilationHook(compiler);
    this.registerDoneHook(compiler);
  }

  registerRunHook(compiler) {
    compiler.hooks.run.tapPromise('DynamicDllPlugin', async () => {
      await this.init();
    });
  }

  registerWatchRunHook(compiler) {
    compiler.hooks.watchRun.tapPromise('DynamicDllPlugin', async () => {
      await this.init();
    });
  }

  registerBeforeCompileHook(compiler) {
    compiler.hooks.beforeCompile.tapPromise('DynamicDllPlugin', async ({ normalModuleFactory }) => {
      normalModuleFactory.hooks.factory.tap(
        'DynamicDllPlugin',
        (actualFactory) => (params, cb) => {
          // This is used in order to avoid the cache for DLL modules
          // resolved from other dependencies
          normalModuleFactory.cachePredicate = (module) => !(module.stubType === DLL_ENTRY_STUB_MODULE_TYPE);

          // Overrides the normalModuleFactory module creation behaviour
          // in order to understand the modules we need to add to the DLL
          actualFactory(params, (error, module) => {
            if (error || !module) {
              cb(error, module);
            } else {
              this.mapNormalModule(module).then(
                (m = module) => cb(undefined, m),
                error => cb(error)
              );
            }
          });
        }
      );
    });
  }

  registerCompilationHook(compiler) {
    compiler.hooks.compilation.tap('DynamicDllPlugin', compilation => {
      compilation.hooks.needAdditionalPass.tap('DynamicDllPlugin', () => {
        // Verify if we must proceed and check if a dll compilation is needed.
        // We must compile the dll, at least run the procedures to understand)
        // if we already have everything we need inside the dll, everytime
        // we are not under a distributable environment, or dll wasn't
        // yet created.
        if (!this.mustCompileDll()) {
          return compilation.needsDLLCompilation = false;
        }

        // Run the procedures in order to decide if we need
        // a Dll compilation
        const requires = [];
        const rawDllConfig = this.dllCompiler.rawDllConfig;
        const dllContext = rawDllConfig.context;
        const dllOutputPath = rawDllConfig.outputPath;

        for (const module of compilation.modules) {
          // re-include requires for modules already handled by the dll
          if (module.delegateData) {
            const absoluteResource = path.resolve(dllContext, module.userRequest);
            requires.push(`require('${path.relative(dllOutputPath, absoluteResource)}');`);
          }

          // include requires for modules that need to be added to the dll
          if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
            requires.push(`require('${path.relative(dllOutputPath, module.stubResource)}');`);
          }
        }

        this.afterCompilationEntryPaths = requires.sort().join('\n');
        compilation.needsDLLCompilation = (this.afterCompilationEntryPaths !== this.entryPaths)
          && !this.dllCompiler.dllExistsSync();
        this.entryPaths = this.afterCompilationEntryPaths;

        this.log(
          ['info', 'optimize:dynamic_dll_plugin'],
          compilation.needsDLLCompilation
            ? 'Need to compile the client vendors dll'
            : 'No need to compile client vendors dll'
        );

        return compilation.needsDLLCompilation;
      });
    });
  }

  registerDoneHook(compiler) {
    compiler.hooks.done.tapPromise('DynamicDllPlugin', async stats => {
      if (stats.compilation.needsDLLCompilation) {
        return await this.runDLLCompiler(compiler);
      }

      this.log(['info', 'optimize:dynamic_dll_plugin'], 'Finished all dynamic dll plugin tasks');
    });
  }

  mustCompileDll() {
    const forceDllCreation = process && process.env && process.env.FORCE_DLL_CREATION;

    return !IS_KIBANA_DISTRIBUTABLE || forceDllCreation;
  }

  async runDLLCompiler(mainCompiler) {
    await this.dllCompiler.run(this.entryPaths);

    // We need to purge the cache into the inputFileSystem
    // for every single built in previous compilation
    // that we rely in next ones.
    mainCompiler.inputFileSystem.purge(this.dllCompiler.getManifestPath());
  }

  async mapNormalModule(module) {
    // ignore anything that doesn't have a resource (ignored) or is already delegating to the DLL
    if (!module.resource || module.delegateData) {
      return;
    }

    // ignore anything that needs special loaders or config
    if (module.request.includes('!') || module.request.includes('?')) {
      return;
    }

    // ignore files that are not in node_modules
    if (!inNodeModules(module.resource)) {
      return;
    }

    // also ignore files that are symlinked into node_modules, but only
    // do the `realpath` call after checking the plain resource path
    if (!inNodeModules(await realPathAsync(module.resource))) {
      return;
    }

    const dirs = module.resource.split(path.sep);
    const nodeModuleName = dirs[dirs.lastIndexOf('node_modules') + 1];

    // ignore webpack loader modules
    if (nodeModuleName.endsWith('-loader')) {
      return;
    }

    // ignore modules from plugins
    if (inPluginNodeModules(module.resource)) {
      return;
    }

    // This is a StubModule (as a RawModule) in order
    // to mimic the missing modules from the DLL and
    // also hold useful metadata
    const stubModule = new RawModule(
      `/* pending dll entry */`,
      `dll pending:${module.resource}`,
      module.resource
    );
    stubModule.stubType = DLL_ENTRY_STUB_MODULE_TYPE;
    stubModule.stubResource = module.resource;

    return stubModule;
  }
}
