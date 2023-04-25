/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { migrationRetryCallCluster } from '@kbn/core-elasticsearch-server-internal';
import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { IndexMap } from './core';
import { TypeStatus, type TypeStatusDetails } from './kibana_migrator_constants';

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
  const defers: Array<Defer<void>> = indices.map(defer);
  const all = Promise.all(defers.map(({ promise }) => promise));
  return indices.reduce<Record<string, Defer<any>>>((acc, indexName, i) => {
    const { resolve, reject } = defers[i];
    acc[indexName] = { resolve, reject, promise: all };
    return acc;
  }, {});
}

export async function getCurrentIndexTypesMap({
  client,
  mainIndex,
  defaultIndexTypesMap,
  logger,
  retryDelay = 2500,
}: {
  client: ElasticsearchClient;
  mainIndex: string;
  defaultIndexTypesMap: IndexTypesMap;
  logger: Logger;
  retryDelay?: number;
}): Promise<IndexTypesMap | undefined> {
  try {
    // check if the main index (i.e. .kibana) exists
    const mapping = await migrationRetryCallCluster(
      () =>
        client.indices.getMapping({
          index: mainIndex,
        }),
      logger,
      retryDelay
    );

    // main index exists, try to extract the indexTypesMap from _meta
    const meta = Object.values(mapping)?.[0]?.mappings._meta;
    return meta?.indexTypesMap ?? defaultIndexTypesMap;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.debug(`The ${mainIndex} index do NOT exist. Assuming this is a fresh deployment`);
      return undefined;
    } else {
      logger.fatal(`Cannot query the meta information on the ${mainIndex} saved object index`);
      throw error;
    }
  }
}

export async function getIndicesInvolvedInRelocation({
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

  const currentIndexTypesMap = await getCurrentIndexTypesMap({
    client,
    mainIndex,
    defaultIndexTypesMap,
    logger,
  });

  if (!currentIndexTypesMap) {
    // this is a fresh deployment, no indices must be relocated
    return [];
  }

  const typeIndexDistribution = calculateTypeStatuses(currentIndexTypesMap, indexTypesMap);

  Object.values(typeIndexDistribution)
    .filter(({ status }) => status === TypeStatus.Moved)
    .forEach(({ currentIndex, targetIndex }) => {
      indicesWithMovingTypesSet.add(currentIndex!);
      indicesWithMovingTypesSet.add(targetIndex!);
    });

  return Array.from(indicesWithMovingTypesSet);
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
