/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const t = require('@babel/types');
const { default: generate } = require('@babel/generator');

/** @typedef {import('./export_set').ExportSet} ExportSet */

/**
 * Generate code for replacing a `export * from './path'`, ie.
 *
 * export type { foo } from './path'
 * export { bar } from './path'

 * @param {ExportSet} exportSet
 * @param {string} source
 */
const getExportCode = (exportSet, source) => {
  const exportedTypes = exportSet.types.size
    ? t.exportNamedDeclaration(
        undefined,
        Array.from(exportSet.types).map((n) => t.exportSpecifier(t.identifier(n), t.identifier(n))),
        t.stringLiteral(source)
      )
    : undefined;

  if (exportedTypes) {
    exportedTypes.exportKind = 'type';
  }

  const exportedValues = exportSet.values.size
    ? t.exportNamedDeclaration(
        undefined,
        Array.from(exportSet.values).map((n) =>
          t.exportSpecifier(t.identifier(n), t.identifier(n))
        ),
        t.stringLiteral(source)
      )
    : undefined;

  return generate(t.program([exportedTypes, exportedValues].filter(Boolean))).code;
};

/**
 * Generate code for replacing a `export * as name from './path'`, ie.
 *
 * import { foo, bar } from './path'
 * export const name = { foo, bar }
 *
 * @param {string} nsName
 * @param {string[]} exportNames
 * @param {string} source
 */
const getExportNamedNamespaceCode = (nsName, exportNames, source) => {
  return generate(
    t.program([
      t.importDeclaration(
        exportNames.map((n) => t.importSpecifier(t.identifier(n), t.identifier(n))),
        t.stringLiteral(source)
      ),
      t.exportNamedDeclaration(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(nsName),
            t.objectExpression(
              exportNames.map((n) =>
                t.objectProperty(t.identifier(n), t.identifier(n), false, true)
              )
            )
          ),
        ])
      ),
    ])
  ).code;
};

module.exports = { getExportCode, getExportNamedNamespaceCode };
