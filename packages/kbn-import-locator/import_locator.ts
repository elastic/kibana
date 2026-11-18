/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// based on the code in https://github.com/nrwl/nx/blob/e12922b02908c90797e038324f2afa4bf69e2eab/packages/nx/src/project-graph/build-dependencies/typescript-import-locator.ts#L62
// simplified to focuse on what we need, see license info in ./strip_source_code

import Fsp from 'fs/promises';
import Ts from 'typescript';

import { stripSourceCode } from './strip_source_code';

const EMPTY = new Set<string>();

export interface ImportLocatorOptions {
  /**
   * Skip `import type` / `export type` statements and specifier lists where every member is
   * `type`, i.e. statements the compiler elides so they never load a module at runtime.
   */
  ignoreTypeOnly?: boolean;
}

const allTypeOnly = (elements: Ts.NodeArray<Ts.ImportSpecifier | Ts.ExportSpecifier>): boolean =>
  elements.length > 0 && elements.every((element) => element.isTypeOnly);

const isTypeOnly = (node: Ts.ImportDeclaration | Ts.ExportDeclaration): boolean => {
  if (Ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (!clause) {
      return false;
    }
    return (
      clause.isTypeOnly ||
      (!clause.name &&
        !!clause.namedBindings &&
        Ts.isNamedImports(clause.namedBindings) &&
        allTypeOnly(clause.namedBindings.elements))
    );
  }
  return (
    node.isTypeOnly ||
    (!!node.exportClause &&
      Ts.isNamedExports(node.exportClause) &&
      allTypeOnly(node.exportClause.elements))
  );
};

export class ImportLocator {
  private readonly scanner: Ts.Scanner;

  constructor(private readonly options: ImportLocatorOptions = {}) {
    this.scanner = Ts.createScanner(Ts.ScriptTarget.Latest, false, Ts.LanguageVariant.JSX);
  }

  get(path: string, content: string): Set<string> {
    const strippedContent = stripSourceCode(this.scanner, content);
    if (strippedContent === '') {
      return EMPTY;
    }

    const imports = new Set<string>();
    const sourceFile = Ts.createSourceFile(path, strippedContent, Ts.ScriptTarget.Latest, true);

    const queue: Ts.Node[] = [sourceFile];
    const addNodeToQueue = (n: Ts.Node) => {
      queue.push(n);
    };

    while (queue.length) {
      const node = queue.shift()!;

      if (
        (Ts.isImportDeclaration(node) || Ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        Ts.isStringLiteral(node.moduleSpecifier)
      ) {
        if (!this.options.ignoreTypeOnly || !isTypeOnly(node)) {
          imports.add(node.moduleSpecifier.text);
        }
        continue;
      }

      if (
        Ts.isCallExpression(node) &&
        node.expression.kind === Ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        Ts.isStringLiteral(node.arguments[0])
      ) {
        imports.add(node.arguments[0].text);
        continue;
      }

      if (
        Ts.isCallExpression(node) &&
        node.expression.getText() === 'require' &&
        node.arguments.length === 1 &&
        Ts.isStringLiteral(node.arguments[0])
      ) {
        imports.add(node.arguments[0].text);
        continue;
      }

      Ts.forEachChild(node, addNodeToQueue);
    }

    return imports;
  }

  async read(path: string): Promise<Set<string>> {
    const content = await Fsp.readFile(path, 'utf8');
    return this.get(path, content);
  }
}
