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

import * as Rx from 'rxjs';
import { mergeAll } from 'rxjs/operators';

import { Bundle, BundleRefs } from '../common';

import { OptimizerConfig } from './optimizer_config';
import { getMtimes } from './get_mtimes';
import { diffCacheKey } from './cache_keys';

export type BundleCacheEvent = BundleNotCachedEvent | BundleCachedEvent;

export interface BundleNotCachedEvent {
  type: 'bundle not cached';
  reason:
    | 'missing optimizer cache key'
    | 'optimizer cache key mismatch'
    | 'missing cache key'
    | 'cache key mismatch'
    | 'cache disabled'
    | 'bundle references missing'
    | 'bundle references outdated';
  diff?: string;
  bundle: Bundle;
}

export interface BundleCachedEvent {
  type: 'bundle cached';
  bundle: Bundle;
}

export function getBundleCacheEvent$(
  config: OptimizerConfig,
  optimizerCacheKey: unknown
): Rx.Observable<BundleCacheEvent> {
  return Rx.defer(async () => {
    const events: BundleCacheEvent[] = [];
    const eligibleBundles: Bundle[] = [];
    const bundleRefs = BundleRefs.fromBundles(config.bundles);

    for (const bundle of config.bundles) {
      if (!config.cache) {
        events.push({
          type: 'bundle not cached',
          reason: 'cache disabled',
          bundle,
        });
        continue;
      }

      const cachedOptimizerCacheKeys = bundle.cache.getOptimizerCacheKey();
      if (!cachedOptimizerCacheKeys) {
        events.push({
          type: 'bundle not cached',
          reason: 'missing optimizer cache key',
          bundle,
        });
        continue;
      }

      const optimizerCacheKeyDiff = diffCacheKey(cachedOptimizerCacheKeys, optimizerCacheKey);
      if (optimizerCacheKeyDiff !== undefined) {
        events.push({
          type: 'bundle not cached',
          reason: 'optimizer cache key mismatch',
          diff: optimizerCacheKeyDiff,
          bundle,
        });
        continue;
      }

      if (!bundle.cache.getCacheKey()) {
        events.push({
          type: 'bundle not cached',
          reason: 'missing cache key',
          bundle,
        });
        continue;
      }

      const bundleRefExportIds = bundle.cache.getBundleRefExportIds();
      if (!bundleRefExportIds) {
        events.push({
          type: 'bundle not cached',
          reason: 'bundle references missing',
          bundle,
        });
        continue;
      }

      const refs = bundleRefs.filterByExportIds(bundleRefExportIds);

      const bundleRefsDiff = diffCacheKey(
        refs.map((r) => r.exportId).sort((a, b) => a.localeCompare(b)),
        bundleRefExportIds
      );
      if (bundleRefsDiff) {
        events.push({
          type: 'bundle not cached',
          reason: 'bundle references outdated',
          diff: bundleRefsDiff,
          bundle,
        });
        continue;
      }

      eligibleBundles.push(bundle);
    }

    const mtimes = await getMtimes(
      new Set<string>(
        eligibleBundles.reduce(
          (acc: string[], bundle) => [...acc, ...(bundle.cache.getReferencedFiles() || [])],
          []
        )
      )
    );

    for (const bundle of eligibleBundles) {
      const diff = diffCacheKey(
        bundle.cache.getCacheKey(),
        bundle.createCacheKey(bundle.cache.getReferencedFiles() || [], mtimes)
      );

      if (diff) {
        events.push({
          type: 'bundle not cached',
          reason: 'cache key mismatch',
          diff,
          bundle,
        });
        continue;
      }

      events.push({
        type: 'bundle cached',
        bundle,
      });
    }

    return events;
  }).pipe(mergeAll());
}
