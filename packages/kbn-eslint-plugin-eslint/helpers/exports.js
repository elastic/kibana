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
const { REPO_ROOT } = require('@kbn/dev-utils');

/** @typedef {import("@typescript-eslint/types").TSESTree.ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").Node} Node */
/** @typedef {(path: string) => ts.SourceFile} Parser */
/** @typedef {ts.Identifier|ts.BindingName} ExportName */

const RESOLUTION_EXTENSIONS = ['.js', '.json', '.ts', '.tsx', '.d.ts'];

/** @param {ts.Statement} node */
const hasExportMod = (node) => {
  return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
};

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
 * @param {ts.Statement} statement
 * @return {ExportName[]|undefined}
 */
const getExportNamesFromStatement = (statement) => {
  // export function xyz() ...
  if (ts.isFunctionDeclaration(statement) && statement.name && hasExportMod(statement)) {
    return [statement.name];
  }

  // export const/let foo = ...
  if (ts.isVariableStatement(statement) && hasExportMod(statement)) {
    return statement.declarationList.declarations.map((dec) => dec.name);
  }

  // export class xyc
  if (ts.isClassDeclaration(statement) && statement.name && hasExportMod(statement)) {
    return [statement.name];
  }

  // export interface Foo {...}
  if (ts.isInterfaceDeclaration(statement) && hasExportMod(statement)) {
    return [statement.name];
  }

  // export type Foo = ...
  if (ts.isTypeAliasDeclaration(statement) && hasExportMod(statement)) {
    return [statement.name];
  }

  // export enum ...
  if (ts.isEnumDeclaration(statement) && hasExportMod(statement)) {
    return [statement.name];
  }

  if (ts.isExportDeclaration(statement)) {
    const clause = statement.exportClause;

    // export * from '../foo';
    if (!clause) {
      return undefined;
    }

    // export * as foo from './foo'
    if (ts.isNamespaceExport(clause)) {
      return [clause.name];
    }

    // export { foo }
    // export { foo as x } from 'other'
    // export { default as foo } from 'other'
    return clause.elements.map((e) => e.name);
  }

  return undefined;
};

/**
 * @param {Parser} parser
 * @param {string} from
 * @param {ts.ExportDeclaration} exportFrom
 * @param {Set<string>} exportNames
 * @returns {Set<string>|undefined}
 */
const getExportNamesDeep = (parser, from, exportFrom, exportNames = new Set()) => {
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
    const ownNames = getExportNamesFromStatement(statement);
    if (ownNames) {
      for (const name of ownNames) {
        exportNames.add(name.getText());
      }
      continue;
    }

    // export * from '../foo';
    if (ts.isExportDeclaration(statement) && !statement.exportClause) {
      if (!getExportNamesDeep(parser, sourceFile.fileName, statement, exportNames)) {
        // abort if we can't get all the exported names
        return undefined;
      }
    }
  }

  return exportNames;
};

module.exports = { getExportNamesDeep, getExportNamesFromStatement };
