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
import { notInNodeModulesOrWebpackShims, inPluginNodeModules } from './dll_allowed_modules';
import { IS_KIBANA_DISTRIBUTABLE } from '../../legacy/utils';
import { dllEntryTemplate } from './dll_entry_template';
import RawModule from 'webpack/lib/RawModule';
import webpack from 'webpack';
import path from 'path';
import normalizePosixPath from 'normalize-path';
import fs from 'fs';
import { promisify } from 'util';

const realPathAsync = promisify(fs.realpath);
const DLL_ENTRY_STUB_MODULE_TYPE = 'javascript/dll-entry-stub';

export class DynamicDllPlugin {
  constructor({ uiBundles, threadLoaderPoolConfig, logWithMetadata, maxCompilations = 1 }) {
    this.logWithMetadata = logWithMetadata || (() => null);
    this.dllCompiler = new DllCompiler(uiBundles, threadLoaderPoolConfig, logWithMetadata);
    this.entryPaths = dllEntryTemplate();
    this.afterCompilationEntryPaths = dllEntryTemplate();
    this.maxCompilations = maxCompilations;
    this.performedCompilations = 0;
    this.forceDLLCreationFlag = !!(process && process.env && process.env.FORCE_DLL_CREATION);
  }

  async init() {
    await this.dllCompiler.init();
    this.entryPaths = await this.dllCompiler.readEntryFiles();
  }

  apply(compiler) {
    // Just register the init basic hooks
    // in order to run the init function
    this.registerInitBasicHooks(compiler);
    // The dll reference should always be bind to the
    // main webpack config.
    this.bindDllReferencePlugin(compiler);

    // Verify if we must init and run the dynamic dll plugin tasks.
    // We must run it every time we are not under a distributable env
    if (!this.mustRunDynamicDllPluginTasks()) {
      return;
    }

    // This call init all the DynamicDllPlugin tasks
    // as it attaches the plugin to the main webpack
    // lifecycle hooks needed to perform the logic
    this.registerTasksHooks(compiler);
  }

  bindDllReferencePlugin(compiler) {
    const rawDllConfig = this.dllCompiler.rawDllConfig;
    const dllContext = rawDllConfig.context;
    const dllManifestPaths = this.dllCompiler.getManifestPaths();

    dllManifestPaths.forEach(dllChunkManifestPath => {
      new webpack.DllReferencePlugin({
        context: dllContext,
        manifest: dllChunkManifestPath,
      }).apply(compiler);
    });
  }

  registerInitBasicHooks(compiler) {
    this.registerRunHook(compiler);
    this.registerWatchRunHook(compiler);
  }

  registerTasksHooks(compiler) {
    this.logWithMetadata(
      ['info', 'optimize:dynamic_dll_plugin'],
      'Started dynamic dll plugin tasks'
    );
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
      normalModuleFactory.hooks.factory.tap('DynamicDllPlugin', actualFactory => (params, cb) => {
        // This is used in order to avoid the cache for DLL modules
        // resolved from other dependencies
        normalModuleFactory.cachePredicate = module =>
          !(module.stubType === DLL_ENTRY_STUB_MODULE_TYPE);

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
      });
    });
  }

  registerCompilationHook(compiler) {
    compiler.hooks.compilation.tap('DynamicDllPlugin', compilation => {
      compilation.hooks.needAdditionalPass.tap('DynamicDllPlugin', () => {
        // Run the procedures in order to execute our dll compilation
        // The process is very straightforward in it's conception:
        //
        // * 1 - loop through every compilation module in order to start building
        //   the dll entry paths arrays and assume it is the new entry paths
        // * 1.1 - start from adding the modules already included into the dll, if any.
        // * 1.2 - adding the new discovered stub modules
        // * 1.3 - check if the module added to the entry path is from node_modules or
        //   webpackShims, otherwise throw an error.
        // * 1.3.1 - for the entry path modules coming from webpackShims search for every
        //   require statements inside of them
        // * 1.3.2 - discard the ones that are not js dependencies
        // * 1.3.3 - add those new discovered dependencies inside the webpackShims to the
        //   entry paths array
        // * 2 - compare the built entry paths and compares it to the old one (if any)
        // * 3 - runs a new dll compilation in case there is none old entry paths or if the
        //   new built one differs from the old one.
        //
        const rawDllConfig = this.dllCompiler.rawDllConfig;
        const dllContext = rawDllConfig.context;
        const dllOutputPath = rawDllConfig.outputPath;
        const requiresMap = {};

        for (const module of compilation.modules) {
          // re-include requires for modules already handled by the dll
          if (module.delegateData) {
            const absoluteResource = path.resolve(dllContext, module.userRequest);
            if (
              absoluteResource.includes('node_modules') ||
              absoluteResource.includes('webpackShims')
            ) {
              // NOTE: normalizePosixPath is been used as we only want to have posix
              // paths inside our final dll entry file
              requiresMap[
                normalizePosixPath(path.relative(dllOutputPath, absoluteResource))
              ] = true;
            }
          }

          // include requires for modules that need to be added to the dll
          if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
            requiresMap[
              normalizePosixPath(path.relative(dllOutputPath, module.stubResource))
            ] = true;
          }
        }

        // Sort and join all the discovered require deps
        // in order to create a consistent entry file
        this.afterCompilationEntryPaths = dllEntryTemplate(Object.keys(requiresMap));
        // The dll compilation will run if on of the following conditions return true:
        // 1 - the new generated entry paths are different from the
        // old ones
        // 2 - if no dll bundle is yet created
        // 3 - if this.forceDLLCreationFlag were set from the node env var FORCE_DLL_CREATION and
        // we are not running over the distributable. If we are running under the watch optimizer,
        // this.forceDLLCreationFlag will only be applied in the very first execution,
        // then will be set to false
        compilation.needsDLLCompilation =
          this.afterCompilationEntryPaths !== this.entryPaths ||
          !this.dllCompiler.dllsExistsSync() ||
          (this.isToForceDLLCreation() && this.performedCompilations === 0);
        this.entryPaths = this.afterCompilationEntryPaths;

        // Only run this info log in the first performed dll compilation
        // per each execution run
        if (this.performedCompilations === 0) {
          this.logWithMetadata(
            ['info', 'optimize:dynamic_dll_plugin'],
            compilation.needsDLLCompilation
              ? 'Need to compile the client vendors dll'
              : 'No need to compile client vendors dll'
          );
        }

        return compilation.needsDLLCompilation;
      });
    });
  }

  registerDoneHook(compiler) {
    compiler.hooks.done.tapPromise('DynamicDllPlugin', async stats => {
      if (stats.compilation.needsDLLCompilation) {
        // Run the dlls compiler and increment
        // the performed compilations
        //
        // NOTE: check the need for this extra try/catch after upgrading
        // past webpack v4.29.3. For now it is needed so we can log the error
        // otherwise the error log we'll get will be something like: [fatal] [object Object]
        try {
          await this.runDLLCompiler(compiler);
        } catch (error) {
          this.logWithMetadata(['error', 'optimize:dynamic_dll_plugin'], error.message);
          throw error;
        }

        return;
      }

      this.performedCompilations = 0;
      // reset this flag var set from the node env FORCE_DLL_CREATION on init,
      // has the force_dll_creation is only valid for the very first run
      if (this.forceDLLCreationFlag) {
        this.forceDLLCreationFlag = false;
      }
      this.logWithMetadata(
        ['info', 'optimize:dynamic_dll_plugin'],
        'Finished all dynamic dll plugin tasks'
      );
    });
  }

  isToForceDLLCreation() {
    return this.forceDLLCreationFlag;
  }

  mustRunDynamicDllPluginTasks() {
    return !IS_KIBANA_DISTRIBUTABLE || this.isToForceDLLCreation();
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
    if (notInNodeModulesOrWebpackShims(module.resource)) {
      return;
    }

    // also ignore files that are symlinked into node_modules, but only
    // do the `realpath` call after checking the plain resource path
    if (notInNodeModulesOrWebpackShims(await realPathAsync(module.resource))) {
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

    // also ignore files that are symlinked into plugins node_modules, but only
    // do the `realpath` call after checking the plain resource path
    if (inPluginNodeModules(await realPathAsync(module.resource))) {
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
    stubModule.stubOriginalModule = module;

    return stubModule;
  }

  async assertMaxCompilations() {
    // Logic to run the max compilation requirements.
    // Only enable this for CI builds in order to ensure
    // we have an healthy dll ecosystem.
    if (this.performedCompilations === this.maxCompilations) {
      throw new Error(
        'All the allowed dll compilations were already performed and one more is needed which is not possible'
      );
    }
  }

  async runDLLCompiler(mainCompiler) {
    const runCompilerErrors = [];

    try {
      await this.dllCompiler.run(this.entryPaths);
    } catch (e) {
      runCompilerErrors.push(e);
    }

    try {
      await this.assertMaxCompilations();
    } catch (e) {
      runCompilerErrors.push(e);
    }

    // We need to purge the cache into the inputFileSystem
    // for every single built in previous compilation
    // that we rely in next ones.
    this.dllCompiler
      .getManifestPaths()
      .forEach(chunkDllManifestPath => mainCompiler.inputFileSystem.purge(chunkDllManifestPath));

    this.performedCompilations++;

    if (!runCompilerErrors.length) {
      return;
    }

    throw new Error(runCompilerErrors.join('\n-'));
  }
}
