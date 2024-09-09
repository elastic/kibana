/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const ts = require('typescript');
const { getExportCode, getExportNamedNamespaceCode } = require('../helpers/codegen');
const tsEstree = require('@typescript-eslint/typescript-estree');

const { getExportNamesDeep } = require('../helpers/exports');

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/parser").ParserServices} ParserServices */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ExportAllDeclaration} EsTreeExportAllDeclaration */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.StringLiteral} EsTreeStringLiteral */
/** @typedef {import("typescript").ExportDeclaration} ExportDeclaration */
/** @typedef {import("../helpers/exports").Parser} Parser */
/** @typedef {import("eslint").Rule.RuleFixer} Fixer */

const ERROR_MSG =
  '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs';

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    return {
      ExportAllDeclaration(node) {
        const services = /** @type ParserServices */ (context.sourceCode.parserServices);
        const esNode = /** @type EsTreeExportAllDeclaration */ (node);
        const tsnode = /** @type ExportDeclaration */ (services.esTreeNodeToTSNodeMap.get(esNode));

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

        const exportSet = getExportNamesDeep(parser, context.getFilename(), tsnode);
        const isTypeExport = esNode.exportKind === 'type';
        const isNamespaceExportWithTypes =
          tsnode.exportClause &&
          ts.isNamespaceExport(tsnode.exportClause) &&
          (isTypeExport || exportSet.types.size);

        /** @param {Fixer} fixer */
        const fix = (fixer) => {
          const source = /** @type EsTreeStringLiteral */ (esNode.source);

          if (tsnode.exportClause && ts.isNamespaceExport(tsnode.exportClause)) {
            return fixer.replaceText(
              node,
              getExportNamedNamespaceCode(
                tsnode.exportClause.name.getText(),
                Array.from(exportSet.values),
                source.value
              )
            );
          }

          return fixer.replaceText(node, getExportCode(exportSet, source.value));
        };

        context.report({
          message: ERROR_MSG,
          loc: node.loc,
          fix: exportSet?.size && !isNamespaceExportWithTypes ? fix : undefined,
        });
      },
    };
  },
};
