/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KqlFunctionNode, nodeBuilder, escapeKuery } from '@kbn/es-query';
import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../../object_types';
import { getObjectKey } from '../internal_utils';
import type { CreatePointInTimeFinderFn } from '../point_in_time_finder';

interface FindLegacyUrlAliasesObject {
  type: string;
  id: string;
}

/**
 * Fetches all legacy URL aliases that match the given objects, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export async function findLegacyUrlAliases(
  createPointInTimeFinder: CreatePointInTimeFinderFn,
  objects: FindLegacyUrlAliasesObject[],
  perPage?: number
) {
  if (!objects.length) {
    return new Map<string, Set<string>>();
  }

  const filter = createAliasKueryFilter(objects);
  const finder = createPointInTimeFinder<LegacyUrlAlias>({
    type: LEGACY_URL_ALIAS_TYPE,
    perPage,
    filter,
  });
  const aliasesMap = new Map<string, Set<string>>();
  let error: Error | undefined;
  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      for (const alias of savedObjects) {
        const { sourceId, targetType, targetNamespace } = alias.attributes;
        const key = getObjectKey({ type: targetType, id: sourceId });
        const val = aliasesMap.get(key) ?? new Set<string>();
        val.add(targetNamespace);
        aliasesMap.set(key, val);
      }
    }
  } catch (e) {
    error = e;
  }

  try {
    await finder.close();
  } catch (e) {
    if (!error) {
      error = e;
    }
  }

  if (error) {
    throw new Error(`Failed to retrieve legacy URL aliases: ${error.message}`);
  }
  return aliasesMap;
}

function createAliasKueryFilter(objects: Array<{ type: string; id: string }>) {
  const kueryNodes = objects.reduce<KqlFunctionNode[]>((acc, { type, id }) => {
    // Escape Kuery values to prevent parsing errors and unintended behavior (object types/IDs can contain KQL special characters/operators)
    const match1 = nodeBuilder.is(getKueryKey('targetType'), escapeKuery(type));
    const match2 = nodeBuilder.is(getKueryKey('sourceId'), escapeKuery(id));
    acc.push(nodeBuilder.and([match1, match2]));
    return acc;
  }, []);
  return nodeBuilder.and([
    nodeBuilder.not(nodeBuilder.is(getKueryKey('disabled'), true)), // ignore aliases that have been disabled
    nodeBuilder.or(kueryNodes),
  ]);
}

function getKueryKey(attribute: string) {
  // Note: these node keys include '.attributes' for type-level fields because these are eventually passed to `validateConvertFilterToKueryNode`, which requires it
  return `${LEGACY_URL_ALIAS_TYPE}.attributes.${attribute}`;
}
