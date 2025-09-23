/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ImportExportEdge, ImportEdge, ItemName } from './types';

/**
 * Finds implicit re-exports by matching imports and exports.
 * An implicit re-export occurs when:
 * 1. Something is imported from another file (import edge)
 * 2. The same local name is then exported (export edge with from: null)
 *
 * Example:
 * import { foo } from './other-module';  // import edge
 * export { foo };                        // export edge -> becomes re-export
 *
 * Note that this doesn't remove the import.
 */
export function normalizeEdges(edges: ImportExportEdge[]): ImportExportEdge[] {
  const importingEdgesByLocalName = new Map<ItemName, ImportEdge>();

  edges.forEach((edge) => {
    if (edge.import?.path && !('export' in edge)) {
      importingEdgesByLocalName.set(edge.local, edge);
    }
  });

  edges.forEach((edge) => {
    if (!('export' in edge) || !edge.local) {
      return;
    }
    const importingEdge = importingEdgesByLocalName.get(edge.local);

    if (importingEdge) {
      edge.import = importingEdge.import;
    }
  });

  return edges;
}
