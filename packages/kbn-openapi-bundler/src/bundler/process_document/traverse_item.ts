/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ResolvedRef } from '../ref_resolver/resolved_ref';
import { TraverseDocumentContext } from './types/context';
import { DocumentNode } from './types/node';

export interface TraverseItem {
  node: DocumentNode;
  context: TraverseDocumentContext;
  /**
   * Keeps track of visited nodes to be able to detect circular references
   */
  visitedDocumentNodes: Set<DocumentNode>;
  parentNode: DocumentNode;
  parentKey: string | number;
  resolvedRef?: ResolvedRef;
}
