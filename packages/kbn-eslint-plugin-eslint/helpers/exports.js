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
const { REPO_ROOT } = require('@kbn/utils');
const { ExportSet } = require('./export_set');

/** @typedef {import("@typescript-eslint/types").TSESTree.ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").Node} Node */
/** @typedef {(path: string) => ts.SourceFile} Parser */
/** @typedef {ts.Identifier|ts.BindingName} ExportNameNode */

const RESOLUTION_EXTENSIONS = ['.js', '.json', '.ts', '.tsx', '.d.ts'];

/** @param {ts.Statement} node */
const hasExportMod = (node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** @param {string} path */
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
 * Recursively traverse from a file path to collect all the exported values/types
 * from the file. Returns an ExportSet which groups the exports by type, either
 * "value" or "type" exports.
 *
 * @param {Parser} parser
 * @param {string} from
 * @param {ts.ExportDeclaration} exportFrom
 * @param {ExportSet | undefined} exportSet only passed when called recursively
 * @param {boolean | undefined} assumeAllTypes only passed when called recursively
 * @returns {ExportSet | undefined}
 */
const getExportNamesDeep = (
  parser,
  from,
  exportFrom,
  exportSet = new ExportSet(),
  assumeAllTypes = false
) => {
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
      exportSet.add(assumeAllTypes ? 'type' : 'value', statement.name.getText());
      continue;
    }

    // export const/let foo = ...
    if (ts.isVariableStatement(statement) && hasExportMod(statement)) {
      for (const dec of statement.declarationList.declarations) {
        exportSet.add(assumeAllTypes ? 'type' : 'value', dec.name.getText());
      }
      continue;
    }

    // export class xyc
    if (ts.isClassDeclaration(statement) && statement.name && hasExportMod(statement)) {
      exportSet.add(assumeAllTypes ? 'type' : 'value', statement.name.getText());
      continue;
    }

    // export interface Foo {...}
    if (ts.isInterfaceDeclaration(statement) && hasExportMod(statement)) {
      exportSet.add('type', statement.name.getText());
      continue;
    }

    // export type Foo = ...
    if (ts.isTypeAliasDeclaration(statement) && hasExportMod(statement)) {
      exportSet.add('type', statement.name.getText());
      continue;
    }

    // export enum ...
    if (ts.isEnumDeclaration(statement) && hasExportMod(statement)) {
      exportSet.add(assumeAllTypes ? 'type' : 'value', statement.name.getText());
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;
      const types = assumeAllTypes || statement.isTypeOnly;

      // export * from '../foo';
      if (!clause) {
        const childTypes = getExportNamesDeep(
          parser,
          sourceFile.fileName,
          statement,
          exportSet,
          types
        );

        if (!childTypes) {
          // abort if we can't get all the exported names
          return undefined;
        }

        continue;
      }

      // export * as foo from './foo'
      if (ts.isNamespaceExport(clause)) {
        exportSet.add(types ? 'type' : 'value', clause.name.getText());
        continue;
      }

      // export { foo }
      // export { foo as x } from 'other'
      // export { default as foo } from 'other'
      for (const e of clause.elements) {
        exportSet.add(types ? 'type' : 'value', e.name.getText());
      }
      continue;
    }
  }

  return exportSet;
};

module.exports = { getExportNamesDeep };
