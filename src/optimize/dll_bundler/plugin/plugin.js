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
import { isEmpty, difference, remove } from 'lodash';

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
    this.entryPaths = [];
    this.waitForBundlerEntryFile = false;
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

  async readCurrentManifest() {
    return JSON.parse(await readFileAsync(this.manifestPath, 'utf8'));
  }

  async ensureEntryExists() {
    const exists = await existsAsync(this.entryPath);
    if (!exists) {
      await mkdirpAsync(path.dirname(this.entryPath));
      await writeFileAsync(this.entryPath, '', 'utf8');
    }
  }

  apply(compiler) {
    this.bindToCompiler(compiler);

    new webpack.DllReferencePlugin({
      context: this.dllConfig.context,
      manifest: this.manifestPath,
    }).apply(compiler);
  }

  runEntryPathsCompiler(compiler) {
    return new Promise((resolve) => {
      const mainCompilerConfig = compiler.options;
      // Filter out this own plugin from the main compiler
      // config to avoid exceed max stack size
      remove(mainCompilerConfig.plugins, (plugin) => {
        return plugin === this;
      });

      this.entryPathsCompiler = webpack(mainCompilerConfig);

      this.entryPathsCompiler.hooks.beforeCompile.tapPromise('DynamicDllPlugin', async ({ normalModuleFactory }) => {
        normalModuleFactory.hooks.factory.tap(
          'NormalModuleFactory',
          (actualFactory) => (params, cb) => {
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

      this.entryPathsCompiler.hooks.emit.tapPromise('DynamicDllPlugin', async (compilation) => {
        const requests = [];
        const requires  = [];

        for (const module of compilation.modules) {
          // re-include requires for modules already handled by the dll
          if (module.delegateData) {
            const absoluteResource = path.resolve(this.dllConfig.context, module.request);
            requests.push(`${path.relative(this.dllConfig.outputPath, absoluteResource)}`);
            requires.push(`require(${path.relative(this.dllConfig.outputPath, absoluteResource)});`);
          }

          // include requires for modules that need to be added to the dll
          if (module.type === DLL_ENTRY_STUB_MODULE_TYPE) {
            requests.push(`${path.relative(this.dllConfig.outputPath, module.resource)}`);
            requires.push(`require(${path.relative(this.dllConfig.outputPath, module.resource)});`);
          }

        }

        console.log('done, ', requests.length);

        // const same = this.isSame(this.entryPaths, requests);
        // const oldContent = await readFileAsync(this.entryPath, 'utf8');
        // const newContent = '\n' + requires.sort().join('\n');

        this.entryPaths = requests.slice(0);

        //if (oldContent !== newContent) {
        this.entryPaths = requests.sort().slice(0);
        // await this.runDLLsCompiler();
        //}
      });

      this.entryPathsCompiler.run(() => {
        resolve();
      });
    });
  }

  bindToCompiler(compiler) {
    compiler.hooks.run.tapPromise('DynamicDllPlugin', async () => {
      console.log('starting compile');
      await this.ensureManifestExists();
      await this.ensureEntryExists();
    });

    compiler.hooks.watchRun.tapAsync('DynamicDllPlugin', async (a, cb) => {
      console.log('starting compile');
      await this.ensureManifestExists();
      await this.ensureEntryExists();
      cb();
    });

    compiler.hooks.beforeCompile.tapPromise('DynamicDllPlugin', async ({ normalModuleFactory }) => {
      // if (this.waitForBundlerEntryFile) {
      //   console.log('before compile compiling DLL');
      //   console.log('waiting for dll bundler');
      //   await this.runDLLsCompiler();
      //   this.waitForBundlerEntryFile = false;
      // }

      normalModuleFactory.hooks.factory.tap(
        'NormalModuleFactory',
        (actualFactory) => (params, cb) => {
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
      // console.log('FDXXXXXXXXXXXXX');
      if (compilation.compiler !== compiler || this.waitForBundlerEntryFile) {
        // ignore child compilations from plugins like mini-css-extract-plugin
        return;
      }

      console.log('OLAAAAAAAAAAAAA');

      compilation.hooks.needAdditionalPass.tap('DynamicDllPlugin', () => {
        const stubs = compilation.modules.filter(m => m.type === DLL_ENTRY_STUB_MODULE_TYPE);

        if (!stubs.length) {
          return false;
        }

        console.log('... need additional pass, dll missing', stubs.map(m => m.resource).length);
        return true;
      });
    });


    compiler.hooks.emit.tapPromise('DynamicDLLPlugin', async (compilation) => {
      console.log('last compiler step start');


      const requires = [];

      for (const module of compilation.modules) {
        // re-include requires for modules already handled by the dll
        if (module.delegateData) {
          const absoluteResource = path.resolve(this.dllConfig.context, module.request);
          requires.push(`${path.relative(this.dllConfig.outputPath, absoluteResource)}`);
        }

        // include requires for modules that need to be added to the dll
        if (module.type === DLL_ENTRY_STUB_MODULE_TYPE) {
          requires.push(`${path.relative(this.dllConfig.outputPath, module.resource)}`);
        }
      }

      const same = this.isSame(this.entryPaths, requires);

      if (!same) {
        console.log('writing new bundler entry file');
        this.entryPaths = requires.slice(0);
        this.waitForBundlerEntryFile = true;
        await this.runDLLsCompiler();
        this.waitForBundlerEntryFile = false;

        for (const [key, module] of Object.entries(compilation.cache)) {
          if (module.type === DLL_ENTRY_STUB_MODULE_TYPE) {
            delete compilation.cache[key];
          }
        }
      }
      console.log('last compiler step end');
    });

  }

  isSame(arrayOne, arrayTwo) {
    let a = arrayOne;
    let b = arrayTwo;

    if (arrayOne.length <= arrayTwo.length) {
      a = arrayTwo;
      b = arrayOne;
    }
    return isEmpty(difference(a.sort(), b.sort()));
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

    const stubModule = new RawModule(
      `/* pending dll entry */`,
      `dll pending:${module.resource}`,
      module.resource
    );
    stubModule.type = DLL_ENTRY_STUB_MODULE_TYPE;
    stubModule.resource = module.resource;
    return stubModule;
  }
}
