/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import type { IndexMap } from './core';
import { TypeStatus, type TypeStatusDetails } from './kibana_migrator_constants';

// even though this utility class is present in @kbn/kibana-utils-plugin, we can't easily import it from Core
// aka. one does not simply reuse code
class Defer<T> {
  public resolve!: (data?: T) => void;
  public reject!: (error: any) => void;
  public promise: Promise<any> = new Promise<any>((resolve, reject) => {
    (this as any).resolve = resolve;
    (this as any).reject = reject;
  });
}

export type WaitGroup<T> = Defer<T>;

export function waitGroup<T>(): WaitGroup<T> {
  return new Defer<T>();
}

export function createWaitGroupMap<T>(keys: string[]): Record<string, WaitGroup<T>> {
  if (!keys?.length) {
    return {};
  }

  const defers: Array<WaitGroup<T>> = keys.map(() => waitGroup<T>());

  // every member of the WaitGroup will wait for all members to resolve
  const all = Promise.all(defers.map(({ promise }) => promise));

  return keys.reduce<Record<string, WaitGroup<T>>>((acc, indexName, i) => {
    const { resolve, reject } = defers[i];
    acc[indexName] = { resolve, reject, promise: all };
    return acc;
  }, {});
}

export function getIndicesInvolvedInRelocation(
  currentIndexTypesMap: IndexTypesMap,
  desiredIndexTypesMap: IndexTypesMap
): string[] {
  const indicesWithRelocatingTypesSet = new Set<string>();

  const typeIndexDistribution = calculateTypeStatuses(currentIndexTypesMap, desiredIndexTypesMap);

  Object.values(typeIndexDistribution)
    .filter(({ status }) => status === TypeStatus.Moved)
    .forEach(({ currentIndex, targetIndex }) => {
      indicesWithRelocatingTypesSet.add(currentIndex!);
      indicesWithRelocatingTypesSet.add(targetIndex!);
    });

  return Array.from(indicesWithRelocatingTypesSet);
}

export function indexMapToIndexTypesMap(indexMap: IndexMap): IndexTypesMap {
  return Object.entries(indexMap).reduce<IndexTypesMap>((acc, [indexAlias, { typeMappings }]) => {
    acc[indexAlias] = Object.keys(typeMappings).sort();
    return acc;
  }, {});
}

export function calculateTypeStatuses(
  currentIndexTypesMap: IndexTypesMap,
  desiredIndexTypesMap: IndexTypesMap
): Record<string, TypeStatusDetails> {
  const statuses: Record<string, TypeStatusDetails> = {};

  Object.entries(currentIndexTypesMap).forEach(([currentIndex, types]) => {
    types.forEach((type) => {
      statuses[type] = {
        currentIndex,
        status: TypeStatus.Removed, // type is removed unless we still have it
      };
    });
  });

  Object.entries(desiredIndexTypesMap).forEach(([targetIndex, types]) => {
    types.forEach((type) => {
      if (!statuses[type]) {
        statuses[type] = {
          targetIndex,
          status: TypeStatus.Added, // type didn't exist, it must be new
        };
      } else {
        statuses[type].targetIndex = targetIndex;
        statuses[type].status =
          statuses[type].currentIndex === targetIndex ? TypeStatus.Untouched : TypeStatus.Moved;
      }
    });
  });

  return statuses;
}
