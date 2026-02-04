/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TraverseDocumentNodeContext } from './document_processors/types/traverse_document_node_context';
import type { TraverseItem } from './traverse_item';

const contextCache = new WeakMap<TraverseItem, TraverseDocumentNodeContext>();

export function createNodeContext(traverseItem: TraverseItem): TraverseDocumentNodeContext {
  if (contextCache.has(traverseItem)) {
    return contextCache.get(traverseItem)!;
  }

  const node = {
    ...traverseItem.context,
    isRootNode: traverseItem.node === traverseItem.parentNode,
    parent: traverseItem.parent ? createNodeContext(traverseItem.parent) : undefined,
    parentNode: traverseItem.parentNode,
    parentKey: traverseItem.parentKey,
  };

  contextCache.set(traverseItem, node);

  return node;
}
