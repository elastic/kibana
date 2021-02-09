/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { Node } from 'ts-morph';
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
    const symbol = node.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      if (declarations.length === 1) {
        // Unfortunately we are losing some reference links here.
        signature = declarations[0].getType().getText(node);
      }
    }
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
      .map((h) => h.getText())
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
