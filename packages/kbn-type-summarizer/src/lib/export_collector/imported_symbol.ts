/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { DecSymbol, findKind } from '../ts_nodes';
import { ExportInfo } from '../export_info';

const cache = new WeakMap<DecSymbol, ImportedSymbol>();

export class ImportedSymbol {
  static fromSymbol(source: DecSymbol, importSymbol: DecSymbol, moduleId: string) {
    const cached = cache.get(source);
    if (cached) {
      return cached;
    }

    if (importSymbol.declarations.length !== 1) {
      throw new Error('expected import symbol to have exactly one declaration');
    }

    const dec = importSymbol.declarations[0];
    if (
      !ts.isImportClause(dec) &&
      !ts.isExportSpecifier(dec) &&
      !ts.isImportSpecifier(dec) &&
      !ts.isNamespaceImport(dec)
    ) {
      const kind = findKind(dec);
      throw new Error(
        `expected import declaration to be an ImportClause, ImportSpecifier, or NamespaceImport, got ${kind}`
      );
    }

    if (!dec.name) {
      throw new Error(`expected ${findKind(dec)} to have a name defined`);
    }

    const imp = ts.isImportClause(dec)
      ? new ImportedSymbol(importSymbol, 'default', dec.name.text, dec.isTypeOnly, moduleId)
      : ts.isNamespaceImport(dec)
      ? new ImportedSymbol(importSymbol, '*', dec.name.text, dec.parent.isTypeOnly, moduleId)
      : new ImportedSymbol(
          importSymbol,
          dec.name.text,
          dec.propertyName?.text,
          dec.isTypeOnly || dec.parent.parent.isTypeOnly,
          moduleId
        );

    cache.set(source, imp);
    return imp;
  }

  public exportInfo: ExportInfo | undefined;

  constructor(
    public readonly symbol: DecSymbol,
    public readonly remoteName: string,
    public readonly localName: string | undefined,
    public readonly isTypeOnly: boolean,
    public readonly moduleId: string
  ) {}
}
