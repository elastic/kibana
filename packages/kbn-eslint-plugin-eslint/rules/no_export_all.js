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
      const { source, exported, exportKind } = /** @type EsTreeExportAllDeclaration */ (node);
      const exportSet = getExportNamesDeep(parser, context.filename, source.value);
      const canFix =
        exportSet?.size > 0 && !(exported && (exportKind === 'type' || exportSet.types.size > 0));

      context.report({
        message: ERROR_MSG,
        loc: node.loc,
        fix: canFix
          ? /** @param {Fixer} fixer */ (fixer) =>
              fixer.replaceText(
                node,
                exported
                  ? getExportNamedNamespaceCode(
                      context.sourceCode.getText(exported),
                      Array.from(exportSet.values),
                      source.value
                    )
                  : getExportCode(exportSet, source.value)
              )
          : undefined,
      });
    },
  }),
};
