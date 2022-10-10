/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

import { describeNode, isAliasSymbol } from '@kbn/type-summarizer-core';
import { isExportableDec, getSymbolDeclarations } from './ts_nodes';

export type ExportDetails = NamedExportDetails | DefaultExportDetails;

export interface DefaultExportDetails {
  type: 'default';
}

export interface NamedExportDetails {
  type: 'named';
  typeOnly: boolean;
  name: string;
}

/**
 * Determine the export name of an export symbol
 */
function getExportName(node: ts.Node): string {
  if (ts.isExportSpecifier(node) || isExportableDec(node)) {
    return node.name.text;
  }

  throw new Error(`unsure how to get export name from ${describeNode(node)}`);
}

/**
 * Determine if an export symbol was type-only exported. This would be true if the top-level export
 * statement is type only, or if there are other export statements up the alias chain where the
 * parent symbol was type-only exported.
 */
function isTypeOnlyExported(typeChecker: ts.TypeChecker, exportSymbol: ts.Symbol) {
  if (getSymbolDeclarations(exportSymbol).some((e) => ts.isTypeOnlyImportOrExportDeclaration(e))) {
    return true;
  }

  if (isAliasSymbol(exportSymbol)) {
    const next = typeChecker.getImmediateAliasedSymbol(exportSymbol);
    if (next && isTypeOnlyExported(typeChecker, next)) {
      return true;
    }
  }
  return false;
}

/**
 * Given an exported symbol, determine details about the export from the symbols declarations
 * including if it was a type-only export, a default export, or a named export and the name
 * it was exported with
 */
export function getExportDetails(
  typeChecker: ts.TypeChecker,
  exportSymbol: ts.Symbol
): ExportDetails {
  if (!exportSymbol.declarations?.length) {
    throw new Error('unable to get export details for symbols without any declarations');
  }

  if (
    exportSymbol.declarations.length === 1 &&
    ts.isExportAssignment(exportSymbol.declarations[0])
  ) {
    return {
      type: 'default',
    };
  }

  return {
    type: 'named',
    typeOnly: isTypeOnlyExported(typeChecker, exportSymbol),
    name: getExportName(exportSymbol.declarations[0]),
  };
}
