/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');
const ts = require('typescript');
const tsEstree = require('@typescript-eslint/typescript-estree');
const { REPO_ROOT } = require('@kbn/dev-utils');

/** @typedef {import("@typescript-eslint/parser").ParserServices} ParserServices */
/** @typedef {import("@typescript-eslint/types").TSESTree.ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("eslint").Rule.RuleFixer} Fixer */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("typescript").Program} Program */
/** @typedef {import("typescript").SourceFile} SourceFile */
/** @typedef {import("typescript").ExportDeclaration} ExportDeclaration */
/** @typedef {(path: string) => SourceFile} Parser */

const ERROR_MSG =
  '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs';

const RESOLUTION_EXTENSIONS = ['.js', '.json', '.ts', '.tsx', '.d.ts'];

/** @param {ts.Statement} node */
const hasExportMod = (node) => {
  return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
};

const safeStat = (path) => {
  try {
    return Fs.statSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
};

/**
 * @param {string} dir
 * @param {string} specifier
 * @returns {string|undefined}
 */
const normalizeRelativeSpecifier = (dir, specifier) => {
  if (specifier.startsWith('src/') || specifier.startsWith('x-pack/')) {
    return Path.resolve(REPO_ROOT, specifier);
  }
  if (specifier.startsWith('.')) {
    return Path.resolve(dir, specifier);
  }
};

/**
 * @param {string} basePath
 * @returns {string | undefined}
 */
const checkExtensions = (basePath) => {
  for (const ext of RESOLUTION_EXTENSIONS) {
    const withExt = `${basePath}${ext}`;
    const stats = safeStat(withExt);
    if (stats?.isFile()) {
      return withExt;
    }
  }
};

/**
 * @param {string} dir
 * @param {string} specifier
 * @returns {string|undefined}
 */
const getImportPath = (dir, specifier) => {
  const base = normalizeRelativeSpecifier(dir, specifier);
  if (!specifier) {
    return undefined;
  }

  const noExt = safeStat(base);
  if (noExt && noExt.isFile()) {
    return base;
  }

  if (noExt && noExt.isDirectory()) {
    return checkExtensions(Path.resolve(base, 'index'));
  }

  if (Path.extname(base) !== '') {
    return;
  }

  return checkExtensions(base);
};

/**
 * @param {Parser} parser
 * @param {string} from
 * @param {ExportDeclaration} exportFrom
 * @param {Set<string>} exportNames
 * @returns {Set<string>|undefined}
 */
const getExportNames = (parser, from, exportFrom, exportNames = new Set()) => {
  const specifier = ts.isStringLiteral(exportFrom.moduleSpecifier)
    ? exportFrom.moduleSpecifier.text
    : undefined;

  if (!specifier) {
    return undefined;
  }

  const importPath = getImportPath(Path.dirname(from), specifier);
  if (!importPath) {
    return undefined;
  }

  const sourceFile = parser(importPath);

  for (const statement of sourceFile.statements) {
    // export function xyz() ...
    if (ts.isFunctionDeclaration(statement) && statement.name && hasExportMod(statement)) {
      exportNames.add(statement.name.getText());
      continue;
    }

    // export const/let foo = ...
    if (ts.isVariableStatement(statement) && hasExportMod(statement)) {
      for (const dec of statement.declarationList.declarations) {
        exportNames.add(dec.name.getText());
      }
      continue;
    }

    // export class xyc
    if (ts.isClassDeclaration(statement) && statement.name && hasExportMod(statement)) {
      exportNames.add(statement.name.getText());
      continue;
    }

    // export interface Foo {...}
    if (ts.isInterfaceDeclaration(statement) && hasExportMod(statement)) {
      exportNames.add(statement.name.getText());
      continue;
    }

    // export type Foo = ...
    if (ts.isTypeAliasDeclaration(statement) && hasExportMod(statement)) {
      exportNames.add(statement.name.getText());
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;

      // export * from '../foo';
      if (!clause) {
        if (!getExportNames(parser, sourceFile.fileName, statement, exportNames)) {
          // abort if we can't get all the exported names
          return undefined;
        }
        continue;
      }

      // export * as foo from './foo'
      if (ts.isNamespaceExport(clause)) {
        exportNames.add(clause.name.getText());
        continue;
      }

      // export { foo }
      // export { foo as x } from 'other'
      // export { default as foo } from 'other'
      for (const element of clause.elements) {
        exportNames.add(element.name.getText());
      }
      continue;
    }
  }

  return exportNames;
};

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    return {
      ExportAllDeclaration(node) {
        const services = /** @type {ParserServices} */ (context.parserServices);
        const tsnode = /** @type {ExportDeclaration} */ (services.esTreeNodeToTSNodeMap.get(node));

        /** @type Parser */
        const parser = (path) => {
          const code = Fs.readFileSync(path, 'utf-8');
          const result = tsEstree.parseAndGenerateServices(code, {
            ...context.parserOptions,
            comment: false,
            filePath: path,
          });
          return result.services.program.getSourceFile(path);
        };

        const exportNames = getExportNames(parser, context.getFilename(), tsnode);

        /** @param {Fixer} fixer */
        const fix = (fixer) => {
          const newClause = `{ ${Array.from(exportNames).join(', ')}}`;

          if (tsnode.exportClause && ts.isNamespaceExport(tsnode.exportClause)) {
            return fixer.replaceText(
              node,
              `import ${newClause} from '${
                node.source.value
              }';\n export const ${tsnode.exportClause.name.getText()} = ${newClause}`
            );
          }

          return fixer.replaceText(node, `export ${newClause} from '${node.source.value}';`);
        };

        context.report({
          message: ERROR_MSG,
          loc: node.loc,
          fix: exportNames?.size ? fix : undefined,
        });
      },
    };
  },
};
