/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const ts = require('typescript');
const { getExportCode, getExportNamedNamespaceCode } = require('../helpers/codegen');

const { getExportNamesDeep } = require('../helpers/exports');

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ExportAllDeclaration} EsTreeExportAllDeclaration */
/** @typedef {import("../helpers/exports").Parser} Parser */
/** @typedef {import("eslint").Rule.RuleFixer} Fixer */

const ERROR_MSG =
  '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs';

const sourceFileCache = new Map();

/** @type Parser */
const parser = (path) => {
  if (sourceFileCache.has(path)) {
    return sourceFileCache.get(path);
  }

  const code = fs.readFileSync(path, 'utf-8');
  const sourceFile = ts.createSourceFile(path, code, ts.ScriptTarget.ESNext, true);

  sourceFileCache.set(path, sourceFile);
  return sourceFile;
};

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  createOnce: (context) => ({
    ExportAllDeclaration(node) {
      const esNode = /** @type EsTreeExportAllDeclaration */ (node);
      const source = esNode.source.value;
      const exportSet = getExportNamesDeep(parser, context.filename, source);
      const isTypeExport = esNode.exportKind === 'type';
      const isNamespaceExportWithTypes = esNode.exported && (isTypeExport || exportSet.types.size);

      /** @param {Fixer} fixer */
      const fix = (fixer) => {
        if (esNode.exported) {
          return fixer.replaceText(
            node,
            getExportNamedNamespaceCode(
              context.sourceCode.getText(esNode.exported),
              Array.from(exportSet.values),
              source
            )
          );
        }

        return fixer.replaceText(node, getExportCode(exportSet, source));
      };

      context.report({
        message: ERROR_MSG,
        loc: node.loc,
        fix: exportSet?.size && !isNamespaceExportWithTypes ? fix : undefined,
      });
    },
  }),
};
