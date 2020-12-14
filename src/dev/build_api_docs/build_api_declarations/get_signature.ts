/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { Node } from 'ts-morph';
import { Reference } from '../types';
import { extractImportReferences } from './extract_import_refs';

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
): Array<string | Reference> {
  //  node.getType() on a TypeAliasDeclaration is just a reference to itself. If we don't special case this, then
  // `export type Foo = string | number;` would show up with a signagure of `Foo` that is a link to itself, instead of
  //  `string | number`.
  if (Node.isTypeAliasDeclaration(node)) {
    const symbol = node.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      if (declarations.length === 1) {
        // Unfortunately we are losing some reference links here.
        return extractImportReferences(declarations[0].getType().getText(node), plugins, log);
      }
    }
  }

  if (Node.isFunctionDeclaration(node)) {
    // See https://github.com/dsherret/ts-morph/issues/907#issue-770284331.
    // Unfortunately this has to be manually pieced together, or it comes up as "typeof TheFunction"
    const params = node
      .getParameters()
      .map((p) => `${p.getName()}: ${p.getType().getText()}`)
      .join(', ');
    const returnType = node.getReturnType().getText();
    return extractImportReferences(`(${params}) => ${returnType}`, plugins, log);
  }

  // Need to tack on manually any type parameters or "extends/implements" section.
  if (Node.isInterfaceDeclaration(node) || Node.isClassDeclaration(node)) {
    const heritageClause = node
      .getHeritageClauses()
      .map((h) => h.getText())
      .join(' ');

    return extractImportReferences(
      `${node.getType().getText()}${heritageClause ? ' ' + heritageClause : ''}`,
      plugins,
      log
    );
  }

  // Here, 'node' is explicitly *not* passed in to `getText` otherwise arrow functions won't
  // include reference links. Tests will break if you add it in here, or remove it from above.
  // There is test coverage for all this oddness.
  return extractImportReferences(node.getType().getText(), plugins, log);
}
