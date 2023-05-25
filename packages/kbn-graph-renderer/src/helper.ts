/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WorkspaceEdge } from './types';

export function makeNodeId(field: string, term: string) {
  return field + '..' + term;
}
export function makeEdgeId(edge: WorkspaceEdge) {
  if (edge.id) {
    return edge.id;
  }
  return `${makeNodeId(edge.source.data.field, edge.source.data.term)}-${makeNodeId(
    edge.target.data.field,
    edge.target.data.term
  )}`;
}
