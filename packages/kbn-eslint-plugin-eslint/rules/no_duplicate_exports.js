/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { getExportNamesFromStatement } = require('../helpers/exports');
const ts = require('typescript');

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("eslint").Rule.ReportDescriptor['fix']} ReportFixer */
/** @typedef {import("@typescript-eslint/parser").ParserServices} ParserServices */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("typescript").SourceFile} SourceFile */
/** @typedef {import("../helpers/exports").ExportName} ExportName */
/** @typedef {import("estree").Node} EsTreeNode */

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    return {
      Program() {
        const services = /** @type {ParserServices} */ (context.parserServices);
        const sourceFile = /** @type {SourceFile} */ (services.program.getSourceFile(
          context.getFilename()
        ));

        /**
         * @param {ts.Node} node
         */
        const tsToEs = (node) => {
          return /** @type {EsTreeNode} */ (services.tsNodeToESTreeNodeMap.get(node));
        };

        /** @type {Map<string, ExportName[]>} */
        const exportsByName = new Map();

        for (const statement of sourceFile.statements) {
          const ownNames = getExportNamesFromStatement(statement) ?? [];
          for (const name of ownNames) {
            const id = name.getText();
            const nodes = exportsByName.get(id) ?? [];
            exportsByName.set(id, [...nodes, name]);
          }
        }

        for (const [name, nodes] of exportsByName) {
          for (const node of nodes.slice(1)) {
            /** @type {ReportFixer} */
            const fix = (fixer) => {
              if (!ts.isExportSpecifier(node.parent)) {
                throw new Error('fixer only works for export declarations');
              }

              // clear out entire dec for single named export in export declaration
              if (node.parent.parent.elements.length === 1) {
                return fixer.remove(tsToEs(node.parent.parent.parent));
              }

              // this node is not represented in the estree AST
              const namedExports = node.parent.parent;
              // this one is, so we replace it by recreating the entire declaration
              const declaration = namedExports.parent;
              const esDeclaration = /** @type {ExportNamedDeclaration} */ (tsToEs(declaration));
              const exportSource = declaration.moduleSpecifier.getText();
              const isTypeExport = esDeclaration.exportKind === 'type';
              const mod = isTypeExport ? 'type' : '';

              // otherwise just remove the export specifier and re-print the declaration
              const newExports = `{${node.parent.parent.elements
                .filter((e) => e.name !== node)
                .map((e) => e.getText())
                .join(',')}}`;

              return fixer.replaceText(
                tsToEs(declaration),
                `export ${mod} ${newExports} from ${exportSource};`
              );
            };

            context.report({
              node: tsToEs(node),
              message: `Export "${name}" is already defined`,
              fix: ts.isExportSpecifier(node.parent) ? fix : undefined,
            });
          }
        }
      },
    };
  },
};
