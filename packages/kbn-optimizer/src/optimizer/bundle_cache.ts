/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import * as Rx from 'rxjs';
import { mergeAll } from 'rxjs/operators';
import { dllManifestPath } from '@kbn/ui-shared-deps-npm';

import { Bundle, BundleRefs, Hashes, parseDllManifest } from '../common';

import { OptimizerConfig } from './optimizer_config';
import { diffCacheKey } from './diff_cache_key';

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
    | 'bundle references outdated'
    | 'dll references missing';
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

    for (const bundle of config.filteredBundles) {
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

      if (!bundle.cache.getDllRefKeys()) {
        events.push({
          type: 'bundle not cached',
          reason: 'dll references missing',
          bundle,
        });
        continue;
      }

      eligibleBundles.push(bundle);
    }

    const dllManifest = parseDllManifest(JSON.parse(Fs.readFileSync(dllManifestPath, 'utf8')));
    const hashes = new Hashes();
    for (const bundle of eligibleBundles) {
      const paths = bundle.cache.getReferencedPaths() ?? [];
      await hashes.populate(paths);

      const diff = diffCacheKey(
        bundle.cache.getCacheKey(),
        bundle.createCacheKey(paths, hashes, dllManifest, bundle.cache.getDllRefKeys() ?? [])
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
