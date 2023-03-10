/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type Defer, defer } from '@kbn/kibana-utils-plugin/common';
import type { IndexMap } from './core';
import {
  type TypeIndexMap,
  TypeStatus,
  TypeStatusDetails,
  DEFAULT_TYPE_INDEX_MAP,
  MAIN_SAVED_OBJECT_INDEX,
} from './kibana_migrator_constants';

export function createMultiPromiseDefer(indices: string[]): Record<string, Defer<void>> {
  const defers: Array<Defer<any>> = new Array(indices.length).fill(true).map(() => defer<void>());
  const all = Promise.all(defers.map(({ promise }) => promise));
  return indices.reduce<Record<string, Defer<any>>>((acc, indexName, i) => {
    const { resolve, reject } = defers[i];
    acc[indexName] = { resolve, reject, promise: all };
    return acc;
  }, {});
}

export async function checkTypeIndexDistribution(
  client: ElasticsearchClient,
  desiredIndexMap: TypeIndexMap
): Promise<Record<string, TypeStatusDetails>> {
  const mapping = await client.indices.getMapping({
    index: MAIN_SAVED_OBJECT_INDEX,
  });
  const meta = Object.values(mapping)[0].mappings._meta;
  const currentIndexMap: TypeIndexMap = meta?.typeIndexMap ?? DEFAULT_TYPE_INDEX_MAP;

  return calculateTypeStatuses(currentIndexMap, desiredIndexMap);
}

export function indexMapToTypeIndexMap(indexMap: IndexMap): TypeIndexMap {
  return Object.entries(indexMap).reduce<TypeIndexMap>((acc, [indexAlias, { typeMappings }]) => {
    acc[indexAlias] = Object.keys(typeMappings);
    return acc;
  }, {});
}

function calculateTypeStatuses(
  currentIndexMap: TypeIndexMap,
  desiredIndexMap: TypeIndexMap
): Record<string, TypeStatusDetails> {
  const statuses: Record<string, TypeStatusDetails> = {};

  Object.entries(currentIndexMap).forEach(([currentIndex, types]) => {
    types.forEach((type) => {
      statuses[type] = {
        currentIndex,
        status: TypeStatus.Removed, // type is removed unless we still have it
      };
    });
  });

  Object.entries(desiredIndexMap).forEach(([targetIndex, types]) => {
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
