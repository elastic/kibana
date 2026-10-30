/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ts from 'typescript';
import { stripSourceCode } from '@kbn/import-locator';

const scanner = Ts.createScanner(Ts.ScriptTarget.Latest, false, Ts.LanguageVariant.JSX);

const allSpecifiersAreTypeOnly = (
  elements: Ts.NodeArray<Ts.ImportSpecifier | Ts.ExportSpecifier>
): boolean => elements.length > 0 && elements.every((element) => element.isTypeOnly);

const isRequireCall = (node: Ts.CallExpression): boolean =>
  Ts.isIdentifier(node.expression) && node.expression.text === 'require';

/**
 * Returns the module specifiers of a source file that can load code at runtime: value
 * `import`/`export ... from` statements, and `require()` / dynamic `import()` calls with a literal
 * argument.
 *
 * `import type` / `export type` and specifier lists where every member is `type` are skipped: the
 * compiler elides them, so they never load anything. `@typescript-eslint/consistent-type-imports`
 * keeps type-only usage spelled this way, which is what makes the syntactic check sound.
 *
 * Dynamic `import()` is followed on purpose. Plugin `server/index.ts` files load their plugin
 * class with `await import('./plugin')` at startup, so treating `import()` as lazy would hide
 * most of every plugin; and whether a lazy import runs at startup is a runtime property that
 * static analysis cannot see. Server code has no business loading browser-only packages even
 * lazily, so over-approximating here is the safe side.
 */
export const findValueImports = (path: string, content: string): string[] => {
  const stripped = stripSourceCode(scanner, content);
  if (stripped === '') {
    return [];
  }

  const sourceFile = Ts.createSourceFile(path, stripped, Ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];

  const visit = (node: Ts.Node): void => {
    if (Ts.isImportDeclaration(node) && Ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly) {
        return;
      }
      if (
        clause?.namedBindings &&
        Ts.isNamedImports(clause.namedBindings) &&
        !clause.name &&
        allSpecifiersAreTypeOnly(clause.namedBindings.elements)
      ) {
        return;
      }
      specifiers.push(node.moduleSpecifier.text);
      return;
    }

    if (
      Ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      Ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (node.isTypeOnly) {
        return;
      }
      if (
        node.exportClause &&
        Ts.isNamedExports(node.exportClause) &&
        allSpecifiersAreTypeOnly(node.exportClause.elements)
      ) {
        return;
      }
      specifiers.push(node.moduleSpecifier.text);
      return;
    }

    if (
      Ts.isCallExpression(node) &&
      (node.expression.kind === Ts.SyntaxKind.ImportKeyword || isRequireCall(node)) &&
      node.arguments.length >= 1 &&
      Ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
      return;
    }

    Ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
};
