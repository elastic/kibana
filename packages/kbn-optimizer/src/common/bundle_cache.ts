/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

export interface State {
  optimizerCacheKey?: unknown;
  cacheKey?: unknown;
  moduleCount?: number;
  workUnits?: number;
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

  public getWorkUnits() {
    return this.get().workUnits;
  }

  public getOptimizerCacheKey() {
    return this.get().optimizerCacheKey;
  }

  public clear() {
    this.state = undefined;

    if (this.path) {
      try {
        Fs.unlinkSync(this.path);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }
}
