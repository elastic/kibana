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
import { DLLBundlerCompiler } from '../compiler';
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

export class Plugin {
  constructor({ dllConfig, log }) {
    this.dllConfig = dllConfig;
    this.log = log || (() => {});
    this.entryPath = this.dllConfig.ub.resolvePath('vendor.entry.dll.js');
    this.manifestPath = this.dllConfig.ub.resolvePath('vendor.manifest.dll.json');
    this.dllBundlePath = this.dllConfig.ub.resolvePath('vendor.bundle.dll.json');
    this.entryPaths = '';
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

  apply(compiler) {
    this.bindToCompiler(compiler);

    new webpack.DllReferencePlugin({
      context: this.dllConfig.context,
      manifest: this.manifestPath,
    }).apply(compiler);
  }

  bindToCompiler(compiler) {
    compiler.hooks.run.tapPromise('DynamicDllPlugin', async () => {
      console.log('starting compile');
      await this.ensureManifestExists();
      this.entryPaths = await this.readEnsureEntry();
    });

    compiler.hooks.watchRun.tapPromise('DynamicDllPlugin', async () => {
      console.log('starting compile');
      await this.ensureManifestExists();
      this.entryPaths = await this.readEnsureEntry();
    });

    compiler.hooks.beforeCompile.tapPromise('DynamicDllPlugin', async ({ normalModuleFactory }) => {
      normalModuleFactory.hooks.factory.tap(
        'NormalModuleFactory',
        (actualFactory) => (params, cb) => {
          // This is used in order to avoid the cache for DLL modules
          // resolved from other dependencies
          normalModuleFactory.cachePredicate = (module) => !(module.stubType === DLL_ENTRY_STUB_MODULE_TYPE);

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
        const stubs = compilation.modules.filter(m => m.stubType === DLL_ENTRY_STUB_MODULE_TYPE);

        if (!stubs.length) {
          return false;
        }

        console.log('... need additional pass, dll missing', stubs.map(m => m.resource).length);
        return true;
      });
    });


    compiler.hooks.done.tapAsync('DynamicDllPlugin', async (stats, cb) => {
      const requires = [];

      for (const module of stats.compilation.modules) {
        // re-include requires for modules already handled by the dll
        if (module.delegateData) {
          const absoluteResource = path.resolve(this.dllConfig.context, module.request);
          requires.push(`require('${path.relative(this.dllConfig.outputPath, absoluteResource)}');`);
        }

        // include requires for modules that need to be added to the dll
        //
        // INFO: the condition after the || is used to prevent a double dll compilation
        // when we are under watching mode. After the first done hook, we will go to the
        // needAdditionalPass that will return no and we will get into a second done.
        // If we don't use this trick, a second DLL will be compiled
        // if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE || module.type === module.stubType) {
        //   requires.push(`require('${path.relative(this.dllConfig.outputPath, module.resource)}');`);
        // }
        if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
          requires.push(`require('${path.relative(this.dllConfig.outputPath, module.resource)}');`);
        }
      }

      const newEntryPaths = requires.sort().join('\n');
      this.entryPaths = await this.readEnsureEntry();

      if (newEntryPaths !== this.entryPaths) {
        console.log('writing new bundler entry file');
        this.entryPaths = newEntryPaths;
        await this.runDLLsCompiler();
        compiler.inputFileSystem.purge(this.manifestPath);

        // if (stats.compilation.modules) {
        //   for(let i = 0; i < stats.compilation.modules.length; i++) {
        //     const module = stats.compilation.modules[i];
        //     if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
        //       module.stubType = module.type;
        //     }
        //   }
        // }

        console.log('new entry file, new manifest and new dll');
      }

      // if (stats.compilation.cache) {
      //   for (const [key, module] of Object.entries(stats.compilation.cache)) {
      //     if (module.stubType === DLL_ENTRY_STUB_MODULE_TYPE) {
      //       console.log('cache');
      //       delete stats.compilation.cache[key];
      //     }
      //   }
      // }

      console.log('done');
      return cb();
    });
  }

  async runDLLsCompiler() {
    this.dllCompiler = new DLLBundlerCompiler(this.dllConfig, this.log);
    this.dllCompiler.upsertDllEntryFile(this.entryPaths);
    await this.dllCompiler.run();
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

    // #CodeBlock1
    //
    // When run in watching mode and we add a new module
    // on the fly, it will cause an error because
    // this raw module will be injected in the chunk and so the code
    // won't be found.
    //
    //
    const stubModule = new RawModule(
      `/* pending dll entry */`,
      `dll pending:${module.resource}`,
      module.resource
    );
    stubModule.stubType = DLL_ENTRY_STUB_MODULE_TYPE;
    stubModule.resource = module.resource;
    return stubModule;
    //
    //

    // #CodeBlock2
    //
    // If we use that instead of the above #CodeBlock1
    // the plugin also works well in the watching mode when
    // we add a new dependency. However instead of linking it
    // to the DLL it adds the module to the the chunk.
    // Maybe a possible solution will be to inject the DelegateModule here
    // in the same way that DelegatedModuleFactoryPlugin does.
    // If we weren't able to do it we can try to understand if we are
    // on watching mode and then only add here a simple DelegateModule
    //
    //
    // module.stubType = DLL_ENTRY_STUB_MODULE_TYPE;
    // return module;
    //
    //
  }
}
