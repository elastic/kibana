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
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import del from 'del';
import mkdirp from 'mkdirp';

const mkdirpAsync = promisify(mkdirp);

interface Params {
  directory: string;
  checkYarnLock: boolean;
  checkIncompleteCompile: boolean;
}

interface StateContent {
  readonly inUseByProc?: number;
  readonly yarnLockSha?: string;
}

export class CacheState {
  private directory: Params['directory'];
  private checkYarnLock: Params['checkYarnLock'];
  private checkIncompleteCompile: Params['checkIncompleteCompile'];
  private yarnLockSha?: string;
  private statePath: string;

  constructor(params: Params) {
    this.directory = params.directory;
    this.checkYarnLock = params.checkYarnLock;
    this.checkIncompleteCompile = params.checkIncompleteCompile;

    this.statePath = resolve(this.directory, 'state.json');

    if (this.checkYarnLock) {
      this.yarnLockSha = createHash('sha1')
        .update(readFileSync(resolve(__dirname, '../../../yarn.lock'), 'utf8'))
        .digest('hex');
    }
  }

  public async maybeResetCache() {
    if (!this.isResetNeeded()) {
      return;
    }

    // start by deleting the state file to lower the
    // amount of time that another process might be able to
    // successfully read it once we decide to delete it
    del.sync(this.statePath);
    await del(this.directory);
    await mkdirpAsync(this.directory);
    this.write();
  }

  public markInUse() {
    this.write({
      ...this.read(),
      inUseByProc: process.pid,
    });
  }

  public markNotInUse() {
    const state = this.read();
    if (state.inUseByProc === process.pid) {
      this.write({
        ...state,
        inUseByProc: undefined,
      });
    }
  }

  private isResetNeeded() {
    const state = this.read();

    if (this.checkYarnLock && state.yarnLockSha !== this.yarnLockSha) {
      return true;
    }

    if (this.checkIncompleteCompile && state.inUseByProc) {
      return true;
    }

    return false;
  }

  private write(state: StateContent = {}) {
    writeFileSync(
      this.statePath,
      JSON.stringify(
        {
          ...state,
          yarnLockSha: this.yarnLockSha,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  private read(): StateContent {
    try {
      return JSON.parse(readFileSync(this.statePath, 'utf8'));
    } catch (error) {
      return {};
    }
  }
}
