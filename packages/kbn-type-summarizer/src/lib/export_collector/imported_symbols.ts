/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { ExportFromDeclaration } from '../ts_nodes';

export class ImportedSymbols {
  type = 'import' as const;

  constructor(
    public readonly exported: boolean,
    public readonly importNode: ts.ImportDeclaration | ExportFromDeclaration,
    // TODO: I'm going to need to keep track of local names for these... unless that's embedded in the symbols
    public readonly symbols: ts.Symbol[]
  ) {}
}
