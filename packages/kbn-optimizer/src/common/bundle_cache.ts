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

import Fs from 'fs';
import Path from 'path';

export interface State {
  optimizerCacheKey?: unknown;
  cacheKey?: unknown;
  moduleCount?: number;
  files?: string[];
  bundleRefExportIds?: string[];
}

const DEFAULT_STATE: State = {};
const DEFAULT_STATE_JSON = JSON.stringify(DEFAULT_STATE);

/**
 * Helper to read and update metadata for bundles.
 */
export class BundleCache {
  private state: State | undefined = undefined;
  constructor(private readonly path: string | false) {}

  refresh() {
    this.state = undefined;
  }

  get() {
    if (!this.state) {
      let json;
      try {
        if (this.path) {
          json = Fs.readFileSync(this.path, 'utf8');
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      let partialCache: Partial<State>;
      try {
        partialCache = JSON.parse(json || DEFAULT_STATE_JSON);
      } catch (error) {
        partialCache = {};
      }

      this.state = {
        ...DEFAULT_STATE,
        ...partialCache,
      };
    }

    return this.state;
  }

  set(updated: State) {
    this.state = updated;
    if (this.path) {
      const directory = Path.dirname(this.path);
      Fs.mkdirSync(directory, { recursive: true });
      Fs.writeFileSync(this.path, JSON.stringify(this.state, null, 2));
    }
  }

  public getModuleCount() {
    return this.get().moduleCount;
  }

  public getReferencedFiles() {
    return this.get().files;
  }

  public getBundleRefExportIds() {
    return this.get().bundleRefExportIds;
  }

  public getCacheKey() {
    return this.get().cacheKey;
  }

  public getOptimizerCacheKey() {
    return this.get().optimizerCacheKey;
  }
}
