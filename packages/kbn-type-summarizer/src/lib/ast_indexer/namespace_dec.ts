/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

import { DecSymbol } from '../ts_nodes';
import { ExportDetails } from './export_details';

export class NamespaceDec {
  public exported: ExportDetails | undefined;

  constructor(
    public readonly rootSymbol: DecSymbol,
    public readonly sourceFile: ts.SourceFile,
    public readonly members: Map<string, DecSymbol>
  ) {}

  size = 1;
}
