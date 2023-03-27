/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { IndexMap } from './core';
import {
  type IndexTypesMap,
  TypeStatus,
  type TypeStatusDetails,
} from './kibana_migrator_constants';

// even though this utility class is present in @kbn/kibana-utils-plugin, we can't easily import it from Core
// aka. one does not simply reuse code
export class Defer<T> {
  public resolve!: (data: T) => void;
  public reject!: (error: any) => void;
  public promise: Promise<any> = new Promise<any>((resolve, reject) => {
    (this as any).resolve = resolve;
    (this as any).reject = reject;
  });
}

export const defer = () => new Defer<void>();

export function createMultiPromiseDefer(indices: string[]): Record<string, Defer<void>> {
  const defers: Array<Defer<void>> = new Array(indices.length).fill(true).map(defer);
  const all = Promise.all(defers.map(({ promise }) => promise));
  return indices.reduce<Record<string, Defer<any>>>((acc, indexName, i) => {
    const { resolve, reject } = defers[i];
    acc[indexName] = { resolve, reject, promise: all };
    return acc;
  }, {});
}

export async function getIndicesInvoledInRelocation({
  client,
  mainIndex,
  indexTypesMap,
  defaultIndexTypesMap,
  logger,
}: {
  client: ElasticsearchClient;
  mainIndex: string;
  indexTypesMap: IndexTypesMap;
  defaultIndexTypesMap: IndexTypesMap;
  logger: Logger;
}): Promise<string[]> {
  const indicesWithMovingTypesSet = new Set<string>();

  try {
    // obtain the current type index map from the
    const mapping = await client.indices.getMapping({
      index: mainIndex,
    });
    const meta = Object.values(mapping)?.[0]?.mappings._meta;
    const currentIndexMap: IndexTypesMap = meta?.indexTypesMap ?? defaultIndexTypesMap;

    const typeIndexDistribution = calculateTypeStatuses(currentIndexMap, indexTypesMap);

    const relocated = Object.entries(typeIndexDistribution).filter(
      ([, { status }]) => status === TypeStatus.Moved
    );
    relocated.forEach(([, { currentIndex, targetIndex }]) => {
      indicesWithMovingTypesSet.add(currentIndex!);
      indicesWithMovingTypesSet.add(targetIndex!);
    });

    return Array.from(indicesWithMovingTypesSet);
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.debug(`The ${mainIndex} index does NOT exist. Assuming this is a fresh deployment`);
      return [];
    } else {
      logger.fatal('Cannot query the meta information of the main saved object index');
      throw error;
    }
  }
}

export function indexMapToIndexTypesMap(indexMap: IndexMap): IndexTypesMap {
  return Object.entries(indexMap).reduce<IndexTypesMap>((acc, [indexAlias, { typeMappings }]) => {
    acc[indexAlias] = Object.keys(typeMappings);
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
