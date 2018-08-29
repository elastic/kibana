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
import { fromRoot } from '../../utils';
import { PUBLIC_PATH_PLACEHOLDER } from '../public_path_placeholder';
import fs from 'fs';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import { promisify } from 'util';
import path from 'path';

const readFileAsync = promisify(fs.readFile);
const mkdirpAsync = promisify(mkdirp);
const existsAsync = promisify(fs.exists);
const writeFileAsync = promisify(fs.writeFile);

export class DllCompiler {
  constructor(uiBundles, log) {
    this.rawDllConfig = this.createRawDllConfig(uiBundles);
    this.log = log || (() => {});
  }

  createRawDllConfig(uiBundles) {
    return {
      context: fromRoot('.'),
      entryName: 'vendors',
      dllName: '[name]',
      manifestName: '[name]',
      styleName: '[name]',
      entryExt: '.entry.dll.js',
      dllExt: '.bundle.dll.js',
      manifestExt: '.manifest.dll.json',
      styleExt: '.style.dll.css',
      outputPath: `${uiBundles.getWorkingDir()}`,
      publicPath: PUBLIC_PATH_PLACEHOLDER
    };
  }

  async init() {
    await this.upsertEntryFile();
    await this.upsertManifestFile(
      JSON.stringify({
        name: this.rawDllConfig.entryName,
        content: {},
      })
    );
  }

  async upsertEntryFile(content) {
    await this.upsertFile(this.getEntryPath(), content);
  }

  async upsertManifestFile(content) {
    await this.upsertFile(this.getManifestPath(), content);
  }

  async upsertFile(filePath, content = '') {
    await this.ensurePathExists();
    await writeFileAsync(filePath, content, 'utf8');
  }

  getEntryPath() {
    return this.resolvePath(
      `${this.rawDllConfig.entryName}${this.rawDllConfig.entryExt}`
    );
  }

  getManifestPath() {
    return this.resolvePath(
      `${this.rawDllConfig.entryName}${this.rawDllConfig.manifestExt}`
    );
  }

  async ensurePathExists(filePath) {
    const exists = await existsAsync(filePath);

    if (!exists) {
      await mkdirpAsync(path.dirname(filePath));
    }
  }

  resolvePath() {
    return path.resolve(this.rawDllConfig.outputPath, ...arguments);
  }

  async readEntryFile(filePath) {
    return await this.readFile(filePath);
  }

  async readFile(filePath, content) {
    await this.upsertEntryFile(filePath, content);
    return await readFileAsync(filePath, 'utf8');
  }

  async run(dllEntries) {
    const dllConfig = this.dllConfigGenerator(this.rawDllConfig);
    await this.upsertEntryFile(dllEntries);

    return await this.runWebpack(dllConfig);
  }

  dllConfigGenerator(dllConfig) {
    return configModel.bind(this, dllConfig);
  }

  async runWebpack(config) {
    return new Promise((resolve, reject) => {
      this.log(['info', 'optimize:dynamic_dll_plugin'], 'Client vendors dll compilation started');

      webpack(config, (err, stats) => {
        // If a critical error occurs
        // reject the promise
        if (err) {
          this.log(
            ['fatal', 'optimize:dynamic_dll_plugin'],
            `Client vendors dll compilation failed`
          );
          return reject(err);
        }

        // Otherwise let it proceed
        this.log(
          ['info', 'optimize:dynamic_dll_plugin'],
          `Client vendors dll compilation finished with success and the following stats:\n\n${stats}`
        );
        return resolve(stats);
      });
    });
  }
}
