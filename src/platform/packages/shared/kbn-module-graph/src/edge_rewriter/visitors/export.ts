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
import {
  ExportAllDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
} from '@babel/types';
import { VisitorContext } from './types';

export function createExportAllDeclarationVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, ExportAllDeclaration> {
  return function (callPath) {
    const node = callPath.node;

    // ExportAllDeclaration always has a source (export * from 'module')
    if (!node.source) {
      return;
    }

    const specifier = node.source.value;

    // For export *, the itemName is '*' representing all exports
    visitorContext.withEdgeRewrite('*', specifier, (rewrite) => {
      // Update the source specifier to point to the rewritten module
      node.source!.value = rewrite.filePath;
    });
  };
}

export function createExportNamedDeclarationVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, ExportNamedDeclaration> {
  return function (callPath) {
    const node = callPath.node;

    // Only handle re-exports (export { foo, bar } from 'module')
    // Local exports (export { foo, bar }) don't need rewriting
    if (!node.source) {
      return;
    }

    const originalSpecifier = node.source.value;

    // Single specifier - no splitting needed, just apply rewrite if available
    if (node.specifiers.length === 1) {
      const spec = node.specifiers[0];
      if (spec.type === 'ExportSpecifier') {
        const localName = spec.local.name;
        visitorContext.withEdgeRewrite(localName, originalSpecifier, (rewrite) => {
          node.source!.value = rewrite.filePath;
          if (rewrite.itemName && rewrite.itemName !== localName) {
            spec.local = t.identifier(rewrite.itemName);
          }
        });
      } else if (spec.type === 'ExportNamespaceSpecifier') {
        // Handle export * as ns from 'module' - use '*' as the item name
        visitorContext.withEdgeRewrite('*', originalSpecifier, (rewrite) => {
          node.source!.value = rewrite.filePath;
        });
      }
      return;
    }

    // Multiple specifiers - split into individual export statements
    const newExportStatements: ExportNamedDeclaration[] = [];

    node.specifiers.forEach((spec) => {
      if (spec.type === 'ExportSpecifier') {
        // Use the local name (what we're importing) for the rewrite lookup
        const localName = spec.local.name;

        // Create individual export statement for this specifier
        const newExport = t.exportNamedDeclaration(
          null, // no declaration
          [spec], // single specifier
          t.stringLiteral(originalSpecifier) // source
        );

        // Apply rewrite if available
        visitorContext.withEdgeRewrite(localName, originalSpecifier, (rewrite) => {
          if (newExport.source) {
            newExport.source.value = rewrite.filePath;
          }
          if (rewrite.itemName && rewrite.itemName !== localName) {
            spec.local = t.identifier(rewrite.itemName);
          }
        });

        newExportStatements.push(newExport);
      } else if (spec.type === 'ExportNamespaceSpecifier') {
        // Handle export * as ns from 'module' - don't split, just rewrite
        visitorContext.withEdgeRewrite('*', originalSpecifier, (rewrite) => {
          node.source!.value = rewrite.filePath;
        });
        return; // Don't add to newExportStatements since we're modifying in place
      }
    });

    // Replace the original export with multiple individual exports
    if (newExportStatements.length > 0) {
      const next = callPath.replaceWithMultiple(newExportStatements);
      next.forEach((item) => item.skip());
    }
  };
}

export function createExportDefaultDeclarationVisitor<S>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, ExportDefaultDeclaration> {
  return function (callPath) {
    // ExportDefaultDeclaration is used for local default exports like 'export default foo'
    // It doesn't have a source property and doesn't need import rewriting
    // This visitor is mainly a no-op but kept for consistency with the plugin architecture
    return;
  };
}
