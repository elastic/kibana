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

const DEFAULT_STATE = JSON.stringify({});

interface State {
  moduleCounts: { [key: string]: number | undefined };
}

/**
 * Helper to read and update metadata for bundles.
 *
 * Currently only tracks the module count of bundles, allowing
 * us to assign bundles to workers in a way that ensures an even
 * distribution of modules to be built
 */
export class OptimizerCache {
  private state: State | undefined = undefined;
  constructor(private readonly path: string | false) {}

  private getState() {
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
        partialCache = JSON.parse(json || DEFAULT_STATE);
      } catch (error) {
        partialCache = {};
      }

      this.state = {
        moduleCounts: partialCache.moduleCounts || {},
      };
    }

    return this.state;
  }

  getBundleModuleCount(bundleId: string) {
    const state = this.getState();
    return state.moduleCounts[bundleId];
  }

  saveBundleModuleCount(bundleId: string, count: number) {
    const current = this.getState();

    this.setState({
      ...current,
      moduleCounts: {
        ...current.moduleCounts,
        [bundleId]: count,
      },
    });
  }

  private scheduledWrite = false;
  private setState(updated: State) {
    this.state = updated;

    if (!this.scheduledWrite && this.path) {
      const path = this.path;
      const directory = Path.dirname(path);
      this.scheduledWrite = true;
      process.nextTick(() => {
        this.scheduledWrite = false;
        Fs.mkdirSync(directory, { recursive: true });
        Fs.writeFileSync(path, JSON.stringify(this.state, null, 2));
      });
    }
  }
}
