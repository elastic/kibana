/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';

import { UnknownVals } from './ts_helpers';
import { ThemeTags, parseThemeTags } from './theme_tags';

export interface WorkerConfig {
  readonly repoRoot: string;
  readonly watch: boolean;
  readonly dist: boolean;
  readonly themeTags: ThemeTags;
  readonly cache: boolean;
  readonly profileWebpack: boolean;
  readonly browserslistEnv: string;
  readonly optimizerCacheKey: unknown;
}

export type CacheableWorkerConfig = Omit<WorkerConfig, 'watch' | 'profileWebpack' | 'cache'>;

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

    const themes = parseThemeTags(parsed.themeTags);

    return {
      repoRoot,
      cache,
      watch,
      dist,
      profileWebpack,
      optimizerCacheKey,
      browserslistEnv,
      themeTags: themes,
    };
  } catch (error) {
    throw new Error(`unable to parse worker config: ${error.message}`);
  }
}
