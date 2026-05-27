/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, YAMLMap } from 'yaml';
import { isMap, isPair, isScalar, isSeq } from 'yaml';
import { isNestedStepKey } from '../../common/yaml/build_workflow_lookup';

function findInNode(node: unknown, stepName: string): YAMLMap | null {
  if (isSeq(node)) {
    for (const item of node.items) {
      const found = findInNode(item, stepName);
      if (found) return found;
    }
  } else if (isMap(node)) {
    if (node.get('name') === stepName) return node;

    for (const pair of node.items) {
      if (isPair(pair) && isScalar(pair.key) && isNestedStepKey(pair.key.value)) {
        const found = findInNode(pair.value, stepName);
        if (found) return found;
      }
    }
  }
  return null;
}

export function getStepNode(document: Document, stepName: string): YAMLMap | null {
  if (!isMap(document.contents)) {
    return null;
  }
  const stepsNode = document.contents.get('steps');
  if (!stepsNode) {
    return null;
  }
  return findInNode(stepsNode, stepName);
}
