/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { DecSymbol } from './ts_nodes';

type ExportType = 'export' | 'export type';

export class ExportInfo {
  static fromSymbol(symbol: DecSymbol) {
    const exportInfo = symbol.declarations.reduce((acc: ExportInfo | undefined, dec) => {
      const next = ExportInfo.fromNode(dec, symbol);
      if (!acc) {
        return next;
      }

      if (next.name !== acc.name || next.type !== acc.type) {
        throw new Error('unable to handle export symbol with different types of declarations');
      }

      return acc;
    }, undefined);

    if (!exportInfo) {
      throw new Error('unable to get candidates');
    }

    return exportInfo;
  }

  static fromNode(node: ts.Node, symbol: DecSymbol) {
    let type: ExportType = 'export';

    if (ts.isExportSpecifier(node)) {
      if (node.isTypeOnly || node.parent.parent.isTypeOnly) {
        type = 'export type';
      }
    }

    let name;
    if ((ts.isFunctionDeclaration(node) || ts.isExportSpecifier(node)) && node.name) {
      name = node.name.getText();
    }

    return new ExportInfo(name ?? node.getText(), type, symbol);
  }

  constructor(
    public readonly name: string,
    public readonly type: ExportType,
    public readonly symbol: DecSymbol
  ) {}
}
