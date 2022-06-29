/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DecSymbol, ExportableDec } from '../ts_nodes';
import { ExportDetails } from './export_details';

export class CopiedDecs {
  public readonly size: number;
  public exported: ExportDetails | undefined;

  constructor(public readonly rootSymbol: DecSymbol, public readonly decs: ExportableDec[]) {
    this.size = this.decs.length;
  }
}
