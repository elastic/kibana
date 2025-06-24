/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TraverseDocumentNodeContext } from './document_processors/types/traverse_document_node_context';
import { TraverseItem } from './traverse_item';

export function createNodeContext(traverseItem: TraverseItem): TraverseDocumentNodeContext {
  return {
    ...traverseItem.context,
    isRootNode: traverseItem.node === traverseItem.parentNode,
    parentNode: traverseItem.parentNode,
    parentKey: traverseItem.parentKey,
  };
}
