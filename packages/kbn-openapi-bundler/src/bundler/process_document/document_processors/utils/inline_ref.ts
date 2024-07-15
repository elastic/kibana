/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ResolvedRef } from '../../../ref_resolver/resolved_ref';
import { DocumentNode } from '../../types/node';

interface InlinableRefNode {
  $ref?: string;
}

export function inlineRef(node: DocumentNode, resolvedRef: ResolvedRef): void {
  Object.assign(node, resolvedRef.refNode);

  delete (node as InlinableRefNode).$ref;
}
