/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Pair, Scalar, YAMLMap } from 'yaml';
import { isMap, isPair, isScalar, isSeq } from 'yaml';

/**
 * Finds the triggers pair in the YAML document, even if it's empty or has empty items
 * @returns The triggers pair if found, null otherwise
 */
export function getTriggersPair(yamlDocument: Document): Pair | null {
  if (!yamlDocument?.contents || !isMap(yamlDocument.contents)) {
    return null;
  }

  const contents = yamlDocument.contents;
  if (!('items' in contents) || !contents.items) {
    return null;
  }

  const triggersPair = contents.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'triggers'
  );

  return isPair(triggersPair) ? triggersPair : null;
}

/**
 * Finds all trigger nodes in the YAML document
 * @param yamlDocument The YAML document to search for trigger nodes
 * @returns An array of objects containing the trigger node, trigger type, and type pair
 */
export function getTriggerNodes(
  yamlDocument: Document
): Array<{ node: YAMLMap; triggerType: string; typePair: Pair<Scalar, Scalar> }> {
  const triggerNodes: Array<{
    node: YAMLMap;
    triggerType: string;
    typePair: Pair<Scalar, Scalar>;
  }> = [];

  if (!yamlDocument?.contents) {
    return triggerNodes;
  }

  const triggersPair = getTriggersPair(yamlDocument);
  if (!triggersPair?.value || !isSeq(triggersPair.value)) {
    return triggerNodes;
  }

  for (const item of triggersPair.value.items) {
    if (isMap(item)) {
      const typePair = item.items.find(
        (pair): pair is Pair<Scalar, Scalar> =>
          isPair(pair) &&
          isScalar(pair.key) &&
          pair.key.value === 'type' &&
          isScalar(pair.value) &&
          typeof pair.value.value === 'string'
      );

      if (typePair && isScalar(typePair.value) && typeof typePair.value.value === 'string') {
        triggerNodes.push({
          node: item,
          triggerType: typePair.value.value,
          typePair,
        });
      }
    }
  }

  return triggerNodes;
}
