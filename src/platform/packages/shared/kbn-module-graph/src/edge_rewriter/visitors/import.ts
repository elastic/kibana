/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { VisitNodeFunction } from '@babel/traverse';
import * as t from '@babel/types';
import { VisitorContext } from './types';

export function createImportDeclarationVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, t.ImportDeclaration> {
  return function (importPath, state) {
    const node = importPath.node;
    const originalSpecifier = node.source.value;

    // Handle side effect imports (import 'module') - no splitting or rewriting needed
    if (node.specifiers.length === 0) {
      return;
    }

    // Single specifier - no splitting needed, just apply rewrite if available
    if (node.specifiers.length === 1) {
      const spec = node.specifiers[0];
      const itemName = getImportItemName(spec);
      if (itemName) {
        visitorContext.withEdgeRewrite(itemName, originalSpecifier, (rewrite) => {
          node.source.value = rewrite.filePath;

          const singleSpec = spec;
          if (t.isImportSpecifier(singleSpec)) {
            if (rewrite.itemName) {
              if (t.isIdentifier(singleSpec.imported)) {
                singleSpec.imported = t.identifier(rewrite.itemName);
              } else {
                singleSpec.imported = t.stringLiteral(rewrite.itemName);
              }
            }
          } else if (t.isImportDefaultSpecifier(singleSpec)) {
            if (rewrite.itemName && rewrite.itemName !== 'default') {
              const localId = singleSpec.local;
              const newSpec = t.importSpecifier(localId, t.identifier(rewrite.itemName));
              node.specifiers = [newSpec];
            }
          }
        });
      }
      return;
    }

    // Multiple specifiers - split into individual import statements
    const newImportStatements: t.ImportDeclaration[] = [];

    node.specifiers.forEach((spec) => {
      const itemName = getImportItemName(spec);
      if (!itemName) return;

      // Create individual import statement for this specifier
      const newImport = t.importDeclaration([spec], t.stringLiteral(originalSpecifier));

      // Apply rewrite to the individual statement if available
      visitorContext.withEdgeRewrite(itemName, originalSpecifier, (rewrite) => {
        newImport.source.value = rewrite.filePath;

        if (t.isImportSpecifier(spec)) {
          // keep local alias but update imported name
          if (rewrite.itemName) {
            if (t.isIdentifier(spec.imported)) {
              spec.imported = t.identifier(rewrite.itemName);
            } else {
              spec.imported = t.stringLiteral(rewrite.itemName);
            }
          }
        } else if (t.isImportDefaultSpecifier(spec)) {
          // If rewrite targets a non-default export we need to convert to ImportSpecifier
          if (rewrite.itemName !== 'default') {
            const localId = spec.local;
            const importedId = t.identifier(rewrite.itemName || itemName);
            const newSpec = t.importSpecifier(localId, importedId);
            newImport.specifiers[0] = newSpec;
          }
        }
      });

      newImportStatements.push(newImport);
    });

    // Replace the original import with multiple individual imports
    if (newImportStatements.length > 0) {
      const next = importPath.replaceWithMultiple(newImportStatements);
      next.forEach((item) => item.skip());
    }
  };
}

/**
 * Extract the item name for import rewrite lookup from an import specifier
 */
function getImportItemName(
  spec: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier
): string | null {
  if (t.isImportDefaultSpecifier(spec)) {
    // import foo from 'bar'
    return 'default';
  } else if (t.isImportSpecifier(spec)) {
    // import { foo, bar as baz } from 'module'
    return t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
  } else if (t.isImportNamespaceSpecifier(spec)) {
    // import * as ns from 'module'
    return '*';
  }
  return null;
}
