/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SourceNode } from 'source-map';

import { Logger } from '@kbn/type-summarizer-core';
import { AstIndex } from '../ast_index';
import { DtsSnipper } from '../dts_snipper';
import { SourceMapper } from '../source_mapper';
import { TypeSummaryNamer } from './type_summary_namer';

import { printImports } from './print_imports';
import { printLocals } from './print_locals';

/**
 * Produces a `SourceNode` which includes the code and source maps for the type summary. To deal
 * with naming conflicts a `TypeSummaryNamer` instance is created which will allow the printing
 * functions to resolve a `rootSymbol` to a specific name. If a name is not already defines for
 * this `rootSymbol` then one is generated for it (generated names are optionally influenced by
 * a `hint`).
 *
 * The result of this function is a `SourceNode` which has functions necessary to produce the
 * resulting source code (a .d.ts file) and source map which maps the structurs in the .d.ts file
 * to their original source locations in the repository.
 */
export function printTypeSummary(
  sourceMaps: SourceMapper,
  snipper: DtsSnipper,
  log: Logger,
  index: AstIndex
) {
  const names = new TypeSummaryNamer(index);
  const source = new SourceNode();
  printImports(index.imports, names, log, source);
  printLocals(index.locals, names, sourceMaps, snipper, log, source);
  return source;
}
