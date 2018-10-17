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
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import del from 'del';
import deleteEmpty from 'delete-empty';
import globby from 'globby';
import mkdirp from 'mkdirp';
import moment from 'moment';
import parseGitConfig from 'parse-git-config';

const mkdirpAsync = promisify(mkdirp);

interface Params {
  log: (tags: string[], data: string) => void;
  outputPath: string;
  dllsPath: string;
  cachePath: string;
  maxAge: number;
}

interface WatchCacheStateContent {
  gitBranch?: string;
  lastResetTime?: number;
  optimizerConfigSha?: string;
  yarnLockSha?: string;
}

export class WatchCache {
  private readonly log: Params['log'];
  private readonly outputPath: Params['outputPath'];
  private readonly dllsPath: Params['dllsPath'];
  private readonly cachePath: Params['cachePath'];
  private readonly maxAge: Params['maxAge'];
  private readonly statePath: string;
  private readonly cacheState: WatchCacheStateContent;
  private diskCacheState: WatchCacheStateContent;

  constructor(params: Params) {
    this.log = params.log;
    this.outputPath = params.outputPath;
    this.dllsPath = params.dllsPath;
    this.cachePath = params.cachePath;
    this.maxAge = params.maxAge;

    this.statePath = resolve(this.outputPath, 'watch_optimizer_cache_state.json');
    this.cacheState = {};
    this.diskCacheState = this.read();
    this.cacheState.yarnLockSha = this.buildYarnLockSha();
    this.cacheState.optimizerConfigSha = this.buildOptimizerConfigSha();
    this.cacheState.gitBranch = this.getGitBranch();
  }

  public async tryReset() {
    if (!this.isResetNeeded()) {
      return;
    }

    await this.reset();
  }

  public async reset() {
    this.log(['info', 'optimize:watch_cache'], 'The optimizer watch cache will reset');

    // start by deleting the state file to lower the
    // amount of time that another process might be able to
    // successfully read it once we decide to delete it
    del.sync(this.statePath);

    // first delete some empty folder that left
    // from any previous cache reset action
    deleteEmpty.sync(`${this.cachePath}`);

    // delete everything in cache directory
    // except ts-node and bundles
    await del(await globby([`${this.cachePath}`], { dot: true }));

    // delete dlls
    await del(this.dllsPath);
    await mkdirpAsync(this.dllsPath);

    // register new reset time
    this.cacheState.lastResetTime = moment().valueOf();

    // re-write new cache state file
    this.write();

    this.log(['info', 'optimize:watch_cache'], 'The optimizer watch cache has reset');
  }

  private buildShaWithMultipleFiles(filePaths: string[]) {
    const shaHash = createHash('sha1');

    filePaths.forEach((filePath: string) => {
      if (existsSync(filePath)) {
        shaHash.update(readFileSync(filePath), 'utf8');
      }
    });

    return shaHash.digest('hex');
  }

  private buildYarnLockSha() {
    const kibanaYarnLock = resolve(__dirname, '../../../yarn.lock');
    const xpackYarnLock = resolve(__dirname, '../../../x-pack/yarn.lock');

    return this.buildShaWithMultipleFiles([kibanaYarnLock, xpackYarnLock]);
  }

  private buildOptimizerConfigSha() {
    const baseOptimizer = resolve(__dirname, '../base_optimizer.js');
    const dynamicDllConfigModel = resolve(__dirname, '../dynamic_dll_plugin/dll_config_model.js');
    const dynamicDllPlugin = resolve(__dirname, '../dynamic_dll_plugin/dynamic_dll_plugin.js');

    return this.buildShaWithMultipleFiles([baseOptimizer, dynamicDllConfigModel, dynamicDllPlugin]);
  }

  private getGitBranch() {
    const gitHeadFile = readFileSync(resolve(__dirname, '../../../.git/HEAD'), 'utf8');
    const currentBranch = (gitHeadFile.split('ref: refs/heads/').pop() || '').trim();
    const gitConfig = parseGitConfig.expandKeys(
      parseGitConfig.sync({ cwd: __dirname, path: '../../../.git/config' })
    );
    const currentBranchRemote = gitConfig.branch[currentBranch].remote;
    const urlForCurrentBranch = gitConfig.remote[currentBranchRemote].url;

    return `${urlForCurrentBranch}:${currentBranch}`;
  }

  private isResetNeeded() {
    return (
      this.hasYarnLockChanged() ||
      this.hasOptimizerConfigChanged() ||
      this.isLastResetTimeOverMaxAge() ||
      this.hasGitBranchChanged()
    );
  }

  private hasYarnLockChanged() {
    return this.cacheState.yarnLockSha !== this.diskCacheState.yarnLockSha;
  }

  private hasOptimizerConfigChanged() {
    return this.cacheState.optimizerConfigSha !== this.diskCacheState.optimizerConfigSha;
  }

  private isLastResetTimeOverMaxAge() {
    // maxAge is calculated in days
    // a value > 0 means that we want to consider
    // the maxAge to know if we should clean
    // the current cache
    if (this.maxAge > 0) {
      const currentTime = moment();
      const lastResetTime = moment(this.cacheState.lastResetTime);

      return currentTime.diff(lastResetTime, 'days') > this.maxAge;
    }

    return false;
  }

  private hasGitBranchChanged() {
    return this.cacheState.gitBranch !== this.diskCacheState.gitBranch;
  }

  private write() {
    writeFileSync(this.statePath, JSON.stringify(this.cacheState, null, 2), 'utf8');
    this.diskCacheState = this.cacheState;
  }

  private read(): WatchCacheStateContent {
    try {
      return JSON.parse(readFileSync(this.statePath, 'utf8'));
    } catch (error) {
      return {};
    }
  }
}
