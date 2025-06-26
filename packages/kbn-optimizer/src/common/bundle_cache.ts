/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import webpack from 'webpack';
import { RawSource } from 'webpack-sources';

export interface State {
  optimizerCacheKey?: unknown;
  cacheKey?: unknown;
  moduleCount?: number;
  workUnits?: number;
  referencedPaths?: string[];
  remoteBundleImportReqs?: string[];
  dllRefKeys?: string[];
}

const DEFAULT_STATE: State = {};
const DEFAULT_STATE_JSON = JSON.stringify(DEFAULT_STATE);
const CACHE_FILENAME = '.kbn-optimizer-cache';

/**
 * Helper to read and update metadata for bundles.
 */
export class BundleCache {
  private state: State | undefined = undefined;
  private readonly path: string | false;
  constructor(outputDir: string | false) {
    this.path = outputDir === false ? false : Path.resolve(outputDir, CACHE_FILENAME);
  }

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

  public getReferencedPaths() {
    return this.get().referencedPaths;
  }

  public getRemoteBundleImportReqs() {
    return this.get().remoteBundleImportReqs;
  }

  public getDllRefKeys() {
    return this.get().dllRefKeys;
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

  public writeWebpackAsset(compilation: webpack.Compilation) {
    if (!this.path) {
      return;
    }

    const source = new RawSource(JSON.stringify(this.state, null, 2));

    // see https://github.com/jantimon/html-webpack-plugin/blob/33d69f49e6e9787796402715d1b9cd59f80b628f/index.js#L266
    // @ts-expect-error undocumented, used to add assets to the output
    compilation.emitAsset(CACHE_FILENAME, source);
  }
}
