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

import RawModule from 'webpack/lib/RawModule';
import { DllCompiler } from './dll_compiler';
import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import mkdirp from 'mkdirp';

const readFileAsync = promisify(fs.readFile);
const realPathAsync = promisify(fs.realpath);
const mkdirpAsync = promisify(mkdirp);
const existsAsync = promisify(fs.exists);
const writeFileAsync = promisify(fs.writeFile);

const DLL_ENTRY_STUB_MODULE_TYPE = 'javascript/dll-entry-stub';

function inNodeModules(checkPath) {
  return checkPath.includes(`${path.sep}node_modules${path.sep}`);
}

function inPluginNodeModules(checkPath) {
  return checkPath.match(/(\/|\\)plugins.*(\/|\\)node_modules/);
}

export class DynamicDllPlugin {
  constructor({ dllConfig }) {
    this.dllConfig = dllConfig;
    this.log = this.dllConfig.isDistributable ? (data) => process.stdout.write(data + '\n') : console.log;
    this.entryPath = this.dllConfig.ub.resolvePath('vendor.entry.dll.js');
    this.dllPath = this.dllConfig.ub.resolvePath('vendor.dll.js');
    this.manifestPath = this.dllConfig.ub.resolvePath('vendor.manifest.dll.json');
    this.entryPaths = '';
    this.newCompilationEntryPaths = '';
  }

  async ensureManifestExists() {
    const exists = await existsAsync(this.manifestPath);
    if (!exists) {
      await mkdirpAsync(path.dirname(this.manifestPath));
      await writeFileAsync(
        this.manifestPath,
        JSON.stringify({
          name: 'vendor',
          content: {},
        }),
        'utf8'
      );
    }
  }

  async ensureEntryExists() {
    const exists = await existsAsync(this.entryPath);
    if (!exists) {
      await mkdirpAsync(path.dirname(this.entryPath));
      await writeFileAsync(this.entryPath, '', 'utf8');
    }
  }

  async readEnsureEntry() {
    await this.ensureEntryExists();
    return await readFileAsync(this.entryPath, 'utf8');
  }

  mustCheckDllCompilationNeed() {
    if (!this.dllConfig.isDistributable) {
      return true;
    }

    return !fs.existsSync(this.dllPath);
  }

  apply(compiler) {
    this.bindToCompiler(compiler);

    new webpack.DllReferencePlugin({
      context: this.dllConfig.context,
      manifest: this.manifestPath,
    }).apply(compiler);
  }

  bindToCompiler(compiler) {
    compiler.hooks.run.tapPromise('DynamicDllPlugin', async () => {
      this.log('starting compile');
      await this.ensureManifestExists();
      this.entryPaths = await this.readEnsureEntry();
    });

    compiler.hooks.watchRun.tapPromise('DynamicDllPlugin', async () => {
      this.log('starting compile');
      await this.ensureManifestExists();
      this.entryPaths = await this.readEnsureEntry();
    });

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

    compiler.hooks.compilation.tap('DynamicDllPlugin', compilation => {
      compilation.hooks.needAdditionalPass.tap('DynamicDllPlugin', () => {
        // Verify if we must check if a dll compilation is needed
        // In case we are in distributable environment and we already
        // have on dll bundle, we don't need to check it
        // TODO: completely remove the DLL logic on distributable env when we already have the DLL created
        if (!this.mustCheckDllCompilationNeed()) {
          return compilation.needsDLLCompilation = false;
        }

        // Run the procedures in order to decide if we need
        // a Dll compilation
        const requires = [];

        for (const module of compilation.modules) {
          // re-include requires for modules already handled by the dll
          if (module.delegateData) {
            const absoluteResource = path.resolve(this.dllConfig.context, module.userRequest);
            requires.push(`require('${path.relative(this.dllConfig.outputPath, absoluteResource)}');`);
          }

          // include requires for modules that need to be added to the dll
          if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
            requires.push(`require('${path.relative(this.dllConfig.outputPath, module.stubResource)}');`);
          }
        }

        this.newCompilationEntryPaths = requires.sort().join('\n');
        compilation.needsDLLCompilation = (this.newCompilationEntryPaths !== this.entryPaths);
        this.entryPaths = this.newCompilationEntryPaths;

        this.log(
          compilation.needsDLLCompilation
            ? '... need additional pass, dll needs to rebuild'
            : '... no need for additional pass'
        );

        return compilation.needsDLLCompilation;
      });
    });


    compiler.hooks.done.tapPromise('DynamicDllPlugin', async stats => {
      if (stats.compilation.needsDLLCompilation) {
        this.log('writing new bundler entry file');
        await this.runDLLsCompiler(compiler);
      }

      this.log('done');
    });
  }

  async runDLLsCompiler(mainCompiler) {
    this.dllCompiler = new DllCompiler(this.dllConfig, this.log);
    this.dllCompiler.upsertDllEntryFile(this.entryPaths);
    await this.dllCompiler.run();

    // We need to purge the cache into the inputFileSystem
    // for every single built in previous compilation
    // that we rely in next ones.
    mainCompiler.inputFileSystem.purge(this.manifestPath);
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
