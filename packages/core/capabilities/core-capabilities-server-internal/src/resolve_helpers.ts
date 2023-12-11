/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge } from 'lodash';
import type { CapabilitiesSwitcher } from '@kbn/core-capabilities-server';
import type { SwitcherWithId, SwitcherBucket } from './types';

/**
 * Returns true if the two globing paths can intersect.
 *
 * @example
 * ```ts
 * pathsIntersect('*', '*'); // true
 * pathsIntersect('*', 'foo.bar'); // true
 * pathsIntersect('foo.*', 'bar.*'); // false
 * ```
 *
 * @internal
 */
export const pathsIntersect = (pathA: string, pathB: string): boolean => {
  const splitA = pathA.split('.');
  const splitB = pathB.split('.');
  const minLength = Math.min(splitA.length, splitB.length);

  for (let i = 0; i < minLength; i++) {
    const segA = splitA[i];
    const segB = splitB[i];
    if (segA === '*' || segB === '*') {
      return true;
    }
    if (segA !== segB) {
      return false;
    }
  }
  return splitA.length === splitB.length;
};

/**
 * Splits the provided switchers into buckets so that switchers allocated
 * into a given buckets can all be executed in parallel.
 * (each switcher in a given bucket doesn't intersect with any other switcher of the same bucket)
 *
 * @internal
 */
export const splitIntoBuckets = (switchers: SwitcherWithId[]): SwitcherBucket[] => {
  const buckets: SwitcherBucket[] = [];

  const canBeAddedToBucket = (switcher: SwitcherWithId, bucket: SwitcherBucket): boolean => {
    const bucketPaths = [...bucket.bucketPaths];
    for (const switcherPath of switcher.capabilityPath) {
      for (const bucketPath of bucketPaths) {
        if (pathsIntersect(switcherPath, bucketPath)) {
          return false;
        }
      }
    }
    return true;
  };

  const addIntoBucket = (switcher: SwitcherWithId, bucket: SwitcherBucket) => {
    bucket.switchers.push(switcher);
    switcher.capabilityPath.forEach((path) => {
      bucket.bucketPaths.add(path);
    });
  };

  for (const switcher of switchers) {
    let added = false;
    for (const bucket of buckets) {
      // switcher can be added -> we do and we break
      if (canBeAddedToBucket(switcher, bucket)) {
        addIntoBucket(switcher, bucket);
        added = true;
        break;
      }
    }
    // could not find a bucket to add the switch to -> creating a new one
    if (!added) {
      buckets.push({
        switchers: [switcher],
        bucketPaths: new Set(switcher.capabilityPath),
      });
    }
  }

  return buckets;
};

/**
 * Aggregates all the switchers of the given bucket to a single switcher function.
 * Only works under the assumption that the switchers in the bucket don't intersect
 * (But that's the definition of a switcher bucket)
 *
 * @internal
 */
export const convertBucketToSwitcher = (bucket: SwitcherBucket): CapabilitiesSwitcher => {
  // only one switcher in the bucket -> no need to wrap
  if (bucket.switchers.length === 1) {
    return bucket.switchers[0].switcher;
  }

  const switchers = bucket.switchers.map((switcher) => switcher.switcher);

  return async (request, uiCapabilities, useDefaultCapabilities) => {
    const allChanges = await Promise.all(
      switchers.map((switcher) => {
        return switcher(request, uiCapabilities, useDefaultCapabilities);
      })
    );
    return merge({}, ...allChanges);
  };
};
