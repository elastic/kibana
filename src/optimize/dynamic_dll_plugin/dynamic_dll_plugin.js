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
import normalizePosixPath from 'normalize-path';
import fs from 'fs';
import { promisify } from 'util';
import { parseSingleFileSync, dependenciesVisitorsGenerator } from '@kbn/babel-code-parser';

const realPathAsync = promisify(fs.realpath);
const DLL_ENTRY_STUB_MODULE_TYPE = 'javascript/dll-entry-stub';

function inNodeModulesOrWebpackShims(checkPath) {
  return checkPath.includes(`${path.sep}node_modules${path.sep}`)
    || checkPath.includes(`${path.sep}webpackShims${path.sep}`);
}

function inPluginNodeModules(checkPath) {
  return checkPath.match(/[\/\\]plugins.*[\/\\]node_modules/);
}

export class DynamicDllPlugin {
  constructor({ uiBundles, threadLoaderPoolConfig, logWithMetadata, maxCompilations = 1 }) {
    this.logWithMetadata = logWithMetadata || (() => null);
    this.dllCompiler = new DllCompiler(uiBundles, threadLoaderPoolConfig, logWithMetadata);
    this.entryPaths = '';
    this.afterCompilationEntryPaths = '';
    this.maxCompilations = maxCompilations;
    this.performedCompilations = 0;
    this.forceDLLCreationFlag = !!(process && process.env && process.env.FORCE_DLL_CREATION);
  }

  async init() {
    await this.dllCompiler.init();
    this.entryPaths = await this.dllCompiler.readEntryFile();
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
    const dllManifestPath = this.dllCompiler.getManifestPath();

    new webpack.DllReferencePlugin({
      context: dllContext,
      manifest: dllManifestPath,
    }).apply(compiler);
  }

  registerInitBasicHooks(compiler) {
    this.registerRunHook(compiler);
    this.registerWatchRunHook(compiler);
  }

  registerTasksHooks(compiler) {
    this.logWithMetadata(['info', 'optimize:dynamic_dll_plugin'], 'Started dynamic dll plugin tasks');
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
        const resolvedShimsDependenciesMap = {};

        for (const module of compilation.modules) {
          let requiredModulePath = null;

          // re-include requires for modules already handled by the dll
          if (module.delegateData) {
            const absoluteResource = path.resolve(dllContext, module.userRequest);
            if (absoluteResource.includes('node_modules') || absoluteResource.includes('webpackShims')) {
              // NOTE: normalizePosixPath is been used as we only want to have posix
              // paths inside our final dll entry file
              requiresMap[`require('${normalizePosixPath(path.relative(dllOutputPath, absoluteResource))}');`] = true;
              requiredModulePath = absoluteResource;
            }
          }

          // include requires for modules that need to be added to the dll
          if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
            requiresMap[`require('${normalizePosixPath(path.relative(dllOutputPath, module.stubResource))}');`] = true;
            requiredModulePath = module.stubResource;
          }

          // read new requires for modules that reaches the compilation,
          // aren't already being handled by dll and were not also
          // in the entry paths before. The majority should come
          // from webpackShims, otherwise we should throw
          if (requiredModulePath && !requiredModulePath.includes('node_modules')) {
            if (!requiredModulePath.includes('webpackShims')) {
              throw new Error(
                `The following module is reaching the compilation and ins\'t  either a node_module or webpackShim:
                 ${requiredModulePath}
                 `
              );
            }

            // Get dependencies found in each webpack shim entry and just
            // adds them to the global map for the resolvedShimsDependencies
            Object.assign(
              resolvedShimsDependenciesMap,
              this.getDependenciesFromShim(requiredModulePath, compilation)
            );
          }
        }

        // Adds the discovered dep modules in webpackShims
        // to the final require results
        Object.assign(
          requiresMap,
          this.getRequireEntriesFromShimsDependencies(resolvedShimsDependenciesMap, dllOutputPath)
        );

        // Sort and join all the discovered require deps
        // in order to create a consistent entry file
        this.afterCompilationEntryPaths = Object.keys(requiresMap).sort().join('\n');
        // The dll compilation will run if on of the following conditions return true:
        // 1 - the new generated entry paths are different from the
        // old ones
        // 2 - if no dll bundle is yet created
        // 3 - if this.forceDLLCreationFlag were set from the node env var FORCE_DLL_CREATION and
        // we are not running over the distributable. If we are running under the watch optimizer,
        // this.forceDLLCreationFlag will only be applied in the very first execution,
        // then will be set to false
        compilation.needsDLLCompilation = (this.afterCompilationEntryPaths !== this.entryPaths)
          || !this.dllCompiler.dllExistsSync()
          || (this.isToForceDLLCreation() && this.performedCompilations === 0);
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
        // Logic to run the max compilation requirements.
        // Only enable this for CI builds in order to ensure
        // we have an healthy dll ecosystem.
        if (IS_KIBANA_DISTRIBUTABLE && (this.performedCompilations === this.maxCompilations)) {
          throw new Error(
            'All the allowed dll compilations were already performed and one more is needed which is not possible'
          );
        }

        // Run the dlls compiler and increment
        // the performed compilations
        await this.runDLLCompiler(compiler);
        this.performedCompilations++;
        return;
      }

      this.performedCompilations = 0;
      // reset this flag var set from the node env FORCE_DLL_CREATION on init,
      // has the force_dll_creation is only valid for the very first run
      if (this.forceDLLCreationFlag) {
        this.forceDLLCreationFlag = false;
      }
      this.logWithMetadata(['info', 'optimize:dynamic_dll_plugin'], 'Finished all dynamic dll plugin tasks');
    });
  }

  getDependenciesFromShim(requiredModulePath, compilation) {
    // NOTE: is possible we are able to do this reading and searching
    // through the compilation's webpack modules, however
    // for a sake of simplicity, and as the webpackShims
    // should be really small files, we are parsing them
    // manually and getting the requires

    // Internal map to keep track of the dependencies found for the
    // current webpackShim file
    const resolvedShimDependencies = {};

    // Discover the requires inside the webpackShims
    const shimsDependencies = parseSingleFileSync(requiredModulePath, dependenciesVisitorsGenerator);

    // Resolve webpackShims dependencies with alias
    shimsDependencies.forEach((dep) => {
      const isRelative = dep && dep.charAt(0) === '.';
      let absoluteResource = null;

      // check if the dependency value is relative
      if (isRelative) {
        absoluteResource = path.resolve(path.dirname(requiredModulePath), dep);
      } else {
        // get the imports and search for alias in the dependency
        const alias = compilation.compiler.options.resolve.alias;
        const aliasFound = Object.keys(alias).find((aliasKey) => {
          return dep.search(`${aliasKey}/`) !== -1;
        });
        // search for imports with webpack-loaders
        const webpackLoaderFoundIdx = dep.search('!');

        if (webpackLoaderFoundIdx !== -1) {
          // get the loader
          const loader = dep.substring(0, webpackLoaderFoundIdx);
          // get the rest of the dependency require value
          // after the webpack loader char (!)
          const restImport = dep.substring(webpackLoaderFoundIdx + 1);
          // build the first part with the loader resolved
          const absoluteResourceFirstPart = require.resolve(loader);
          // check if we have a relative path in the script require
          // path being passed to the loader
          const isRestImportRelative = restImport && restImport.charAt(0) === '.';
          // resolve the relative script dependency path
          // in case we have one
          const sanitizedRestImport = isRestImportRelative
            ? path.resolve(path.dirname(requiredModulePath), restImport)
            : restImport;
          // replace the alias in the script dependency require path
          // in case we have found the alias
          const absoluteResourceSecondPart = aliasFound
            ? require.resolve(`${alias[aliasFound]}${sanitizedRestImport.substring(aliasFound.length)}`)
            : require.resolve(sanitizedRestImport);

          // finally build our absolute entry path again in the
          // original loader format `webpack-loader!script_path`
          absoluteResource = `${absoluteResourceFirstPart}!${absoluteResourceSecondPart}`;
        } else {
          // in case we don't have any webpack loader in the
          // dependency require value, just replace the alias
          // if we have one and then resolve the result,
          // or just resolve the dependency path if we don't
          // have any alias
          absoluteResource = aliasFound
            ? require.resolve(`${alias[aliasFound]}${dep.substring(aliasFound.length)}`)
            : require.resolve(dep);
        }
      }

      // Only consider found js entries
      if (!absoluteResource.includes('.js') || absoluteResource.includes('json')) {
        return;
      }

      // add the absolute built resource to the list of
      // entry paths found inside the webpackShims
      // to be merged with the general requiresMap
      // in the end
      resolvedShimDependencies[absoluteResource] = true;
    });

    return resolvedShimDependencies;
  }

  getRequireEntriesFromShimsDependencies(resolvedShimsDependenciesMap, dllOutputPath) {
    const internalRequiresMap = {};
    const resolvedShimsDependencies = Object.keys(resolvedShimsDependenciesMap);

    resolvedShimsDependencies.forEach((resolvedDep) => {
      if (resolvedDep) {
        // check if this is a require shim dependency with
        // an webpack-loader
        const webpackLoaderFoundIdx = resolvedDep.search('!');

        if (webpackLoaderFoundIdx !== -1) {
          // get the webpack-loader
          const loader = resolvedDep.substring(0, webpackLoaderFoundIdx);
          // get the rest of the dependency require value
          // after the webpack-loader char (!)
          const restImport = resolvedDep.substring(webpackLoaderFoundIdx + 1);
          // resolve the loader and the restImport parts separately
          const resolvedDepToRequireFirstPart = normalizePosixPath(path.relative(dllOutputPath, loader));
          const resolvedDepToRequireSecondPart = normalizePosixPath(path.relative(dllOutputPath, restImport));

          // rebuild our final webpackShim entry path in the original
          // webpack loader format `webpack-loader!script_path`
          // but right now resolved relatively to the dll output path
          internalRequiresMap[`require('${resolvedDepToRequireFirstPart}!${resolvedDepToRequireSecondPart}');`] = true;
        } else {
          // in case we didn't have any webpack-loader in the require path
          // resolve the dependency path relative to the dllOutput path
          // to get our final entry path
          internalRequiresMap[`require('${normalizePosixPath(path.relative(dllOutputPath, resolvedDep))}');`] = true;
        }
      }
    });

    return internalRequiresMap;
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
    if (!inNodeModulesOrWebpackShims(module.resource)) {
      return;
    }

    // also ignore files that are symlinked into node_modules, but only
    // do the `realpath` call after checking the plain resource path
    if (!inNodeModulesOrWebpackShims(await realPathAsync(module.resource))) {
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

  async runDLLCompiler(mainCompiler) {
    await this.dllCompiler.run(this.entryPaths);

    // We need to purge the cache into the inputFileSystem
    // for every single built in previous compilation
    // that we rely in next ones.
    mainCompiler.inputFileSystem.purge(this.dllCompiler.getManifestPath());
  }
}
