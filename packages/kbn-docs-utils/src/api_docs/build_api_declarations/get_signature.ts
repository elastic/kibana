/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { Node, Type } from 'ts-morph';
import { isNamedNode } from '../tsmorph_utils';
import { Reference } from '../types';
import { extractImportReferences } from './extract_import_refs';
import { getTypeKind } from './get_type_kind';

/**
 * Special logic for creating the signature based on the type of node. See https://github.com/dsherret/ts-morph/issues/923#issue-795332729
 * for some issues that have been encountered in getting these accurate.
 *
 * By passing node to `getText`, ala `node.getType().getText(node)`, all reference links
 * will be lost. However, if you do _not_ pass node, there are quite a few situations where it returns a reference
 * to itself and has no helpful information.
 *
 * @param node
 * @param plugins
 * @param log
 */
export function getSignature(
  node: Node,
  plugins: KibanaPlatformPlugin[],
  log: ToolingLog
): Array<string | Reference> | undefined {
  let signature = '';
  //  node.getType() on a TypeAliasDeclaration is just a reference to itself. If we don't special case this, then
  // `export type Foo = string | number;` would show up with a signagure of `Foo` that is a link to itself, instead of
  //  `string | number`.
  if (Node.isTypeAliasDeclaration(node)) {
    signature = getSignatureForTypeAlias(node.getType(), log, node);
  } else if (Node.isFunctionDeclaration(node)) {
    // See https://github.com/dsherret/ts-morph/issues/907#issue-770284331.
    // Unfortunately this has to be manually pieced together, or it comes up as "typeof TheFunction"
    const params = node
      .getParameters()
      .map((p) => `${p.getName()}: ${p.getType().getText()}`)
      .join(', ');
    const returnType = node.getReturnType().getText();
    signature = `(${params}) => ${returnType}`;
  } else if (Node.isInterfaceDeclaration(node) || Node.isClassDeclaration(node)) {
    // Need to tack on manually any type parameters or "extends/implements" section.
    const heritageClause = node
      .getHeritageClauses()
      .map((h) => {
        const heritance = h.getText().indexOf('implements') > -1 ? 'implements' : 'extends';
        return `${heritance} ${h.getTypeNodes().map((n) => n.getType().getText())}`;
      })
      .join(' ');
    signature = `${node.getType().getText()}${heritageClause ? ' ' + heritageClause : ''}`;
  } else {
    // Here, 'node' is explicitly *not* passed in to `getText` otherwise arrow functions won't
    // include reference links. Tests will break if you add it in here, or remove it from above.
    // There is test coverage for all this oddness.
    signature = node.getType().getText();
  }

  // Don't return the signature if it's the same as the type (string, string)
  if (getTypeKind(node).toString() === signature) return undefined;

  const referenceLinks = extractImportReferences(signature, plugins, log);

  // Don't return the signature if it's a single self referential link.
  if (
    isNamedNode(node) &&
    referenceLinks.length === 1 &&
    typeof referenceLinks[0] === 'object' &&
    (referenceLinks[0] as Reference).text === node.getName()
  ) {
    return undefined;
  }

  return referenceLinks;
}

/**
 * Not all types are handled here, but does return links for the more common ones.
 */
function getSignatureForTypeAlias(type: Type, log: ToolingLog, node?: Node): string {
  if (type.isUnion()) {
    return type
      .getUnionTypes()
      .map((nestedType) => getSignatureForTypeAlias(nestedType, log))
      .join(' | ');
  } else if (node && type.getCallSignatures().length >= 1) {
    return type
      .getCallSignatures()
      .map((sig) => {
        const params = sig
          .getParameters()
          .map((p) => `${p.getName()}: ${p.getTypeAtLocation(node).getText()}`)
          .join(', ');
        const returnType = sig.getReturnType().getText();
        return `(${params}) => ${returnType}`;
      })
      .join(' ');
  } else if (node) {
    const symbol = node.getSymbol();
    if (symbol) {
      const declarations = symbol
        .getDeclarations()
        .map((d) => d.getType().getText(node))
        .join(' ');
      if (symbol.getDeclarations().length !== 1) {
        log.error(
          `Node is type alias declaration with more than one declaration. This is not handled! ${declarations} and node is ${node.getText()}`
        );
      }
      return declarations;
    }
  }
  return type.getText();
}
