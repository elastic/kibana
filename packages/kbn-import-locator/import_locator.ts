/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// based on the code in https://github.com/nrwl/nx/blob/e12922b02908c90797e038324f2afa4bf69e2eab/packages/nx/src/project-graph/build-dependencies/typescript-import-locator.ts#L62
// simplified to focuse on what we need, see license info in ./strip_source_code

import Fsp from 'fs/promises';
import Ts from 'typescript';

import { stripSourceCode } from './strip_source_code';

const EMPTY = new Set<string>();

export class ImportLocator {
  private readonly scanner: Ts.Scanner;

  constructor() {
    this.scanner = Ts.createScanner(Ts.ScriptTarget.Latest, false, Ts.LanguageVariant.JSX);
  }

  get(path: string, content: string): Set<string> {
    const strippedContent = stripSourceCode(this.scanner, content);
    if (strippedContent === '') {
      return EMPTY;
    }

    const imports = new Set<string>();
    const queue: Ts.Node[] = [
      Ts.createSourceFile(path, strippedContent, Ts.ScriptTarget.Latest, true),
    ];
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
        imports.add(node.moduleSpecifier.text);
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
