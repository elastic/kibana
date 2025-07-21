/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

/**
 * Determine whether an ImportDeclaration is used in value-space anywhere.
 * - Side-effect imports (no specifiers) are value-affecting.
 * - `import type` is filtered earlier, but we guard here too.
 * - If at least one imported binding has a non type-only reference, return true.
 */
export function isImportUsedAsValue(
  path: NodePath<t.ImportDeclaration>,
  treatUnusedAsValueUsage: boolean = false
): boolean {
  const node = path.node;

  // Side-effect import: always value-affecting
  if (node.specifiers.length === 0) return true;

  // Entire declaration marked as type
  if (node.importKind === 'type') return false;

  for (const spec of node.specifiers) {
    const local = spec.local?.name;
    if (!local) continue;

    const binding = path.scope.getBinding(local);
    if (!binding) {
      continue;
    }

    const refPaths = binding.referencePaths ?? [];

    // If there are no references recorded, then it's not used as a value
    if (refPaths.length === 0) {
      continue;
    }

    // If ANY reference is not type-only, the import is used as a value
    if (
      refPaths.some(
        (refPath) =>
          t.isIdentifier(refPath.node) && !isTypeOnlyReference(refPath as NodePath<t.Identifier>)
      )
    ) {
      return true;
    }
  }

  // No value-space usage found
  return treatUnusedAsValueUsage;
}

/**
 * Returns true if an identifier reference is clearly in a "type-only" context.
 * We conservatively treat any ancestor node whose type starts with `TS` as a
 * type context, except TSNonNullExpression which exists in value space.
 */
function isTypeOnlyReference(refPath: NodePath<t.Identifier>): boolean {
  const parentTs = refPath.findParent((p) => {
    const type = p.node.type;
    if (!type) return false;
    if (!type.startsWith('TS')) return false;
    // TSNonNullExpression is value-space (e.g. foo!), so don't mark as type-only
    return type !== 'TSNonNullExpression';
  });
  return !!parentTs;
}
