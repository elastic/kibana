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

import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import del from 'del';
import deleteEmpty from 'delete-empty';
import globby from 'globby';
import normalizePosixPath from 'normalize-path';

const readAsync = promisify(readFile);
const writeAsync = promisify(writeFile);

interface Params {
  logWithMetadata: (tags: string[], message: string, metadata?: { [key: string]: any }) => void;
  outputPath: string;
  dllsPath: string;
  cachePath: string;
}

interface WatchCacheStateContent {
  optimizerConfigSha?: string;
  yarnLockSha?: string;
}

export class WatchCache {
  private readonly logWithMetadata: Params['logWithMetadata'];
  private readonly outputPath: Params['outputPath'];
  private readonly dllsPath: Params['dllsPath'];
  private readonly cachePath: Params['cachePath'];
  private readonly cacheState: WatchCacheStateContent;
  private statePath: string;
  private diskCacheState: WatchCacheStateContent;
  private isInitialized: boolean;

  constructor(params: Params) {
    this.logWithMetadata = params.logWithMetadata;
    this.outputPath = params.outputPath;
    this.dllsPath = params.dllsPath;
    this.cachePath = params.cachePath;

    this.isInitialized = false;
    this.statePath = '';
    this.cacheState = {};
    this.diskCacheState = {};
    this.cacheState.yarnLockSha = '';
    this.cacheState.optimizerConfigSha = '';
  }

  public async tryInit() {
    if (!this.isInitialized) {
      this.statePath = resolve(this.outputPath, 'watch_optimizer_cache_state.json');
      this.diskCacheState = await this.read();
      this.cacheState.yarnLockSha = await this.buildYarnLockSha();
      this.cacheState.optimizerConfigSha = await this.buildOptimizerConfigSha();
      this.isInitialized = true;
    }
  }

  public async tryReset() {
    await this.tryInit();

    if (!this.isResetNeeded()) {
      return;
    }

    await this.reset();
  }

  public async reset() {
    this.logWithMetadata(['info', 'optimize:watch_cache'], 'The optimizer watch cache will reset');

    // start by deleting the state file to lower the
    // amount of time that another process might be able to
    // successfully read it once we decide to delete it
    await del(this.statePath, { force: true });

    // delete everything in optimize/.cache directory
    await del(await globby([normalizePosixPath(this.cachePath)], { dot: true }));

    // delete some empty folder that could be left
    // from the previous cache path reset action
    await deleteEmpty(this.cachePath);

    // delete dlls
    await del(this.dllsPath);

    // re-write new cache state file
    await this.write();

    this.logWithMetadata(['info', 'optimize:watch_cache'], 'The optimizer watch cache has reset');
  }

  private async buildShaWithMultipleFiles(filePaths: string[]) {
    const shaHash = createHash('sha1');

    for (const filePath of filePaths) {
      try {
        shaHash.update(await readAsync(filePath, 'utf8'), 'utf8');
      } catch (e) {
        /* no-op */
      }
    }

    return shaHash.digest('hex');
  }

  private async buildYarnLockSha() {
    const kibanaYarnLock = resolve(__dirname, '../../../yarn.lock');

    return await this.buildShaWithMultipleFiles([kibanaYarnLock]);
  }

  private async buildOptimizerConfigSha() {
    const baseOptimizer = resolve(__dirname, '../base_optimizer.js');
    const dynamicDllConfigModel = resolve(__dirname, '../dynamic_dll_plugin/dll_config_model.js');
    const dynamicDllPlugin = resolve(__dirname, '../dynamic_dll_plugin/dynamic_dll_plugin.js');

    return await this.buildShaWithMultipleFiles([
      baseOptimizer,
      dynamicDllConfigModel,
      dynamicDllPlugin,
    ]);
  }

  private isResetNeeded() {
    return this.hasYarnLockChanged() || this.hasOptimizerConfigChanged();
  }

  private hasYarnLockChanged() {
    return this.cacheState.yarnLockSha !== this.diskCacheState.yarnLockSha;
  }

  private hasOptimizerConfigChanged() {
    return this.cacheState.optimizerConfigSha !== this.diskCacheState.optimizerConfigSha;
  }

  private async write() {
    await writeAsync(this.statePath, JSON.stringify(this.cacheState, null, 2), 'utf8');
    this.diskCacheState = this.cacheState;
  }

  private async read(): Promise<WatchCacheStateContent> {
    try {
      return JSON.parse(await readAsync(this.statePath, 'utf8'));
    } catch (error) {
      return {};
    }
  }
}
