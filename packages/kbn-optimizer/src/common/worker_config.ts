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

import Path from 'path';

import { UnknownVals } from './ts_helpers';

export interface WorkerConfig {
  readonly repoRoot: string;
  readonly watch: boolean;
  readonly dist: boolean;
  readonly cache: boolean;
  readonly profileWebpack: boolean;
  readonly browserslistEnv: string;
  readonly optimizerCacheKey: unknown;
}

export function parseWorkerConfig(json: string): WorkerConfig {
  try {
    if (typeof json !== 'string') {
      throw new Error('expected worker config to be a JSON string');
    }

    const parsed: UnknownVals<WorkerConfig> = JSON.parse(json);

    if (!(typeof parsed === 'object' && parsed)) {
      throw new Error('config must be an object');
    }

    const repoRoot = parsed.repoRoot;
    if (typeof repoRoot !== 'string' || !Path.isAbsolute(repoRoot)) {
      throw new Error('`repoRoot` config must be an absolute path');
    }

    const cache = parsed.cache;
    if (typeof cache !== 'boolean') {
      throw new Error('`cache` config must be a boolean');
    }

    const watch = parsed.watch;
    if (typeof watch !== 'boolean') {
      throw new Error('`watch` config must be a boolean');
    }

    const dist = parsed.dist;
    if (typeof dist !== 'boolean') {
      throw new Error('`dist` config must be a boolean');
    }

    const profileWebpack = parsed.profileWebpack;
    if (typeof profileWebpack !== 'boolean') {
      throw new Error('`profileWebpack` must be a boolean');
    }

    const optimizerCacheKey = parsed.optimizerCacheKey;
    if (optimizerCacheKey === undefined) {
      throw new Error('`optimizerCacheKey` must be defined');
    }

    const browserslistEnv = parsed.browserslistEnv;
    if (typeof browserslistEnv !== 'string') {
      throw new Error('`browserslistEnv` must be a string');
    }

    return {
      repoRoot,
      cache,
      watch,
      dist,
      profileWebpack,
      optimizerCacheKey,
      browserslistEnv,
    };
  } catch (error) {
    throw new Error(`unable to parse worker config: ${error.message}`);
  }
}
