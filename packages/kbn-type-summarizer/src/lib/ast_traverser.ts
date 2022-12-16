/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { hasIdentifierName, describeNode, Logger } from '@kbn/type-summarizer-core';
import { isExportableDec } from './ts_nodes';
import { SymbolResolver } from './symbol_resolver';
import { SourceFileMapper } from './source_file_mapper';

/**
 * This object is responsible for exposing utilities for traversing the AST nodes
 * to find relevant identifiers within.
 */
export class AstTraverser {
  constructor(
    private readonly symbols: SymbolResolver,
    private readonly sources: SourceFileMapper,
    private readonly log: Logger
  ) {}

  private doesIdentifierResolveToLocalDeclaration(id: ts.Identifier) {
    const rootSymbol = this.symbols.toRootSymbol(this.symbols.getForIdentifier(id));
    for (const dec of rootSymbol.declarations) {
      if (!this.sources.isExternal(dec)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Traverses through the children of `root` deeply to find all identifiers which are
   * references. Ignores idenfiers which are names of structres (like names of properties,
   * arguments, function declarations, etc) as well as a few other identifiers which we
   * are pretty sure never could point to a reference outside of this node.
   *
   * The goal here is to find all identifiers which we can then convert into symbols to
   * find all the types/values that are referenced by the passed `root` AST node.
   */
  findReferencedIdentifiers(root: ts.Node): Set<ts.Identifier> {
    return this.log.verboseStep('traverse.findReferencedIdentifiers()', root, () => {
      const queue = new Set([root]);
      const identifiers = new Set<ts.Identifier>();

      for (const node of queue) {
        // ImportTypeNode's are inline `import('...').Type` nodes which TS often injects for inferred return types
        // often time these return types are for identifiers from node_modules which we will maintain, since the
        // node modules will be available for the summary. If the imported symbol resolves to local code though
        // we need to grab the referenced identifier and replace the whole ImportTypeNode with a local reference
        // after the declarations for that symbol are included in the summary
        if (ts.isImportTypeNode(node)) {
          // iterate the type arguments of ImportTypeNode
          if (node.typeArguments) {
            for (const arg of node.typeArguments) {
              queue.add(arg);
            }
          }

          if (node.qualifier) {
            // if the qualifier resolves to a local declaration then count it as an identifier, later
            // on we replace the parent node of identifiers inside or `ImportTypeNode`s
            if (ts.isIdentifier(node.qualifier)) {
              if (this.doesIdentifierResolveToLocalDeclaration(node.qualifier)) {
                identifiers.add(node.qualifier);
              }
              continue;
            }

            if (ts.isQualifiedName(node.qualifier) && ts.isIdentifier(node.qualifier.left)) {
              if (this.doesIdentifierResolveToLocalDeclaration(node.qualifier.left)) {
                identifiers.add(node.qualifier.left);
              }
              continue;
            }
          }

          throw new Error(
            `unable to find relevant identifier in ImportTypeNode.qualifier ${describeNode(node)}`
          );
        }

        const ignores: ts.Node[] = [];

        // ignore parameter/property names, names aren't ever references to other declarations AFAIK
        if (hasIdentifierName(node)) {
          ignores.push(node.name);
        }

        // ignore the source name of destructured params ie. X in `function foo({ X: Foo }: Type)`
        if (ts.isBindingElement(node) && node.propertyName) {
          ignores.push(node.propertyName);
        }

        // ignore parameter names in type predicates ie. X in `(foo: any): X is Bar`
        if (ts.isTypePredicateNode(node)) {
          ignores.push(node.parameterName);
        }

        // ignore identifiers in "QualifiedName" nodes, which are found in TypeReferences like
        // `semver.SemVer`, we don't need to treat `SemVer` as a ref because we're capturing `semver`
        if (ts.isQualifiedName(node) && ts.isIdentifier(node.right)) {
          ignores.push(node.right);
        }

        node.forEachChild((child) => {
          if (ignores.includes(child)) {
            return;
          }

          if (ts.isIdentifier(child)) {
            identifiers.add(child);
          } else {
            queue.add(child);
          }
        });
      }

      return identifiers;
    });
  }

  /**
   * Returns "structural" identifiers for a `root` node, which includes the name of the `root` and
   * the name of any "members", like the names of properties in an interface or class, the name of
   * options in an enum, all so we can identify their posistions later on and make sure they reference
   * their source location in the source maps.
   */
  findStructuralIdentifiers(root: ts.Node): Set<ts.Identifier> {
    return this.log.verboseStep('traverse.findStructuralIdentifiers()', root, () => {
      const queue = new Set([root]);
      const identifiers = new Set<ts.Identifier>();

      for (const node of queue) {
        if (isExportableDec(node)) {
          identifiers.add(node.name);
        }

        if (
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeLiteralNode(node) ||
          ts.isEnumDeclaration(node)
        ) {
          for (const member of node.members) {
            if (hasIdentifierName(member)) {
              identifiers.add(member.name);
            }
          }
        }
      }

      return identifiers;
    });
  }
}
