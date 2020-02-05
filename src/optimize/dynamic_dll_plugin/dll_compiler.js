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

import { configModel } from './dll_config_model';
import {
  notInNodeModulesOrWebpackShims,
  notInNodeModules,
  inDllPluginPublic,
} from './dll_allowed_modules';
import {
  dllEntryFileContentArrayToString,
  dllEntryFileContentStringToArray,
  dllMergeAllEntryFilesContent,
} from './dll_entry_template';
import { fromRoot } from '../../core/server/utils';
import { PUBLIC_PATH_PLACEHOLDER } from '../public_path_placeholder';
import fs from 'fs';
import webpack from 'webpack';
import { promisify } from 'util';
import path from 'path';
import del from 'del';
import { chunk } from 'lodash';
import seedrandom from 'seedrandom';

const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const accessAsync = promisify(fs.access);
const writeFileAsync = promisify(fs.writeFile);

export class DllCompiler {
  static getRawDllConfig(
    uiBundles = {},
    babelLoaderCacheDir = '',
    threadLoaderPoolConfig = {},
    chunks = Array.from(Array(4).keys()).map(chunkN => `_${chunkN}`)
  ) {
    return {
      uiBundles,
      babelLoaderCacheDir,
      threadLoaderPoolConfig,
      chunks,
      context: fromRoot('.'),
      entryName: 'vendors',
      dllName: '[name]',
      manifestName: '[name]',
      styleName: '[name]',
      entryExt: '.entry.dll.js',
      dllExt: '.bundle.dll.js',
      manifestExt: '.manifest.dll.json',
      styleExt: '.style.dll.css',
      outputPath: fromRoot('built_assets/dlls'),
      publicPath: PUBLIC_PATH_PLACEHOLDER,
    };
  }

  constructor(uiBundles, threadLoaderPoolConfig, logWithMetadata) {
    this.rawDllConfig = DllCompiler.getRawDllConfig(
      uiBundles,
      uiBundles.getCacheDirectory('babel'),
      threadLoaderPoolConfig
    );
    this.logWithMetadata = logWithMetadata || (() => null);
  }

  async init() {
    await this.ensureEntryFilesExists();
    await this.ensureManifestFilesExists();
    await this.ensureOutputPathExists();
  }

  seededShuffle(array) {
    // Implementation based on https://github.com/TimothyGu/knuth-shuffle-seeded/blob/gh-pages/index.js#L46
    let currentIndex;
    let temporaryValue;
    let randomIndex;
    const rand = seedrandom('predictable', { global: false });

    if (array.constructor !== Array) throw new Error('Input is not an array');
    currentIndex = array.length;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(rand() * currentIndex--);

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  async upsertEntryFiles(content) {
    const arrayContent = this.seededShuffle(dllEntryFileContentStringToArray(content));
    const chunks = chunk(
      arrayContent,
      Math.ceil(arrayContent.length / this.rawDllConfig.chunks.length)
    );
    const entryPaths = this.getEntryPaths();

    await Promise.all(
      entryPaths.map(
        async (entryPath, idx) =>
          await this.upsertFile(entryPath, dllEntryFileContentArrayToString(chunks[idx]))
      )
    );
  }

  async upsertFile(filePath, content = '') {
    await this.ensurePathExists(filePath);
    await writeFileAsync(filePath, content, 'utf8');
  }

  getDllPaths() {
    return this.rawDllConfig.chunks.map(chunk =>
      this.resolvePath(`${this.rawDllConfig.entryName}${chunk}${this.rawDllConfig.dllExt}`)
    );
  }

  getEntryPaths() {
    return this.rawDllConfig.chunks.map(chunk =>
      this.resolvePath(`${this.rawDllConfig.entryName}${chunk}${this.rawDllConfig.entryExt}`)
    );
  }

  getManifestPaths() {
    return this.rawDllConfig.chunks.map(chunk =>
      this.resolvePath(`${this.rawDllConfig.entryName}${chunk}${this.rawDllConfig.manifestExt}`)
    );
  }

  getStylePaths() {
    return this.rawDllConfig.chunks.map(chunk =>
      this.resolvePath(`${this.rawDllConfig.entryName}${chunk}${this.rawDllConfig.styleExt}`)
    );
  }

  async ensureEntryFilesExists() {
    const entryPaths = this.getEntryPaths();

    await Promise.all(entryPaths.map(async entryPath => await this.ensureFileExists(entryPath)));
  }

  async ensureManifestFilesExists() {
    const manifestPaths = this.getManifestPaths();

    await Promise.all(
      manifestPaths.map(
        async (manifestPath, idx) =>
          await this.ensureFileExists(
            manifestPath,
            JSON.stringify({
              name: `${this.rawDllConfig.entryName}${this.rawDllConfig.chunks[idx]}`,
              content: {},
            })
          )
      )
    );
  }

  async ensureStyleFileExists() {
    const stylePaths = this.getStylePaths();

    await Promise.all(stylePaths.map(async stylePath => await this.ensureFileExists(stylePath)));
  }

  async ensureFileExists(filePath, content) {
    const exists = await this.ensurePathExists(filePath);

    if (!exists) {
      await this.upsertFile(filePath, content);
    }
  }

  async ensurePathExists(filePath) {
    try {
      await accessAsync(filePath);
    } catch (e) {
      await mkdirAsync(path.dirname(filePath), { recursive: true });
      return false;
    }

    return true;
  }

  async ensureOutputPathExists() {
    await this.ensurePathExists(this.rawDllConfig.outputPath);
  }

  dllsExistsSync() {
    const dllPaths = this.getDllPaths();

    return dllPaths.every(dllPath => this.existsSync(dllPath));
  }

  existsSync(filePath) {
    return fs.existsSync(filePath);
  }

  resolvePath() {
    return path.resolve(this.rawDllConfig.outputPath, ...arguments);
  }

  async readEntryFiles() {
    const entryPaths = this.getEntryPaths();

    const entryFilesContent = await Promise.all(
      entryPaths.map(async entryPath => await this.readFile(entryPath))
    );

    // merge all the module contents from entry files again into
    // sorted single one
    return dllMergeAllEntryFilesContent(entryFilesContent);
  }

  async readFile(filePath, content) {
    await this.ensureFileExists(filePath, content);
    return await readFileAsync(filePath, 'utf8');
  }

  async run(dllEntries) {
    const dllConfig = this.dllConfigGenerator(this.rawDllConfig);
    await this.upsertEntryFiles(dllEntries);

    try {
      this.logWithMetadata(
        ['info', 'optimize:dynamic_dll_plugin'],
        'Client vendors dll compilation started'
      );

      await this.runWebpack(dllConfig());

      this.logWithMetadata(
        ['info', 'optimize:dynamic_dll_plugin'],
        `Client vendors dll compilation finished with success`
      );
    } catch (e) {
      this.logWithMetadata(
        ['fatal', 'optimize:dynamic_dll_plugin'],
        `Client vendors dll compilation failed`
      );

      // Still throw the original error has here we just want
      // log the fail message
      throw e;
    }

    // Style dll file isn't always created but we are
    // expecting it to exist always as we are referencing
    // it from the bootstrap template
    //
    // NOTE: We should review the way we deal with the css extraction
    // in ours webpack builds. The industry standard is about to
    // only extract css for production but we are extracting it
    // in every single compilation.
    await this.ensureStyleFileExists();
  }

  dllConfigGenerator(dllConfig) {
    return configModel.bind(this, dllConfig);
  }

  async runWebpack(config) {
    return new Promise((resolve, reject) => {
      webpack(config, async (err, stats) => {
        // If a critical error occurs or we have
        // errors in the stats compilation,
        // reject the promise and logs the errors
        const webpackErrors =
          err ||
          (stats.hasErrors() &&
            stats.toString({
              all: false,
              colors: true,
              errors: true,
              errorDetails: true,
              moduleTrace: true,
            }));

        if (webpackErrors) {
          // Reject with webpack fatal errors
          return reject(webpackErrors);
        }

        // Identify if we have not allowed modules
        // bundled inside the dll bundle
        const notAllowedModules = [];

        stats.compilation.modules.forEach(module => {
          // ignore if no module or userRequest are defined
          if (!module || !module.resource) {
            return;
          }

          // ignore if this module represents the
          // dll entry file
          if (this.getEntryPaths().includes(module.resource)) {
            return;
          }

          // ignore if this module is part of the
          // files inside dynamic dll plugin public folder
          if (inDllPluginPublic(module.resource)) {
            return;
          }

          // A module is not allowed if it's not a node_module, a webpackShim
          // or the reasons from being bundled into the dll are not node_modules
          if (notInNodeModulesOrWebpackShims(module.resource)) {
            const reasons = module.reasons || [];

            reasons.forEach(reason => {
              // Skip if we can't read the reason info
              if (!reason || !reason.module || !reason.module.resource) {
                return;
              }

              // Is the reason for this module being bundle a
              // node_module or no?
              if (notInNodeModules(reason.module.resource)) {
                notAllowedModules.push(module.resource);
              }
            });
          }
        });

        if (notAllowedModules.length) {
          // Delete the built dll, as it contains invalid modules, and reject listing
          // all the not allowed modules
          try {
            await del(this.rawDllConfig.outputPath);
          } catch (e) {
            return reject(e);
          }

          return reject(
            `The following modules are not allowed to be bundled into the dll: \n${notAllowedModules.join(
              '\n'
            )}`
          );
        }

        // Otherwise it has succeed
        return resolve(stats);
      });
    });
  }
}
