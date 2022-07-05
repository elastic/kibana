/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { DecSymbol, ExportableDec } from './ts_nodes';
import { ExportDetails } from './export_details';
import { ImportDetails } from './import_details';

/**
 * The AstIndex is produced by AstIndexer to represent all of the declarations/imports/refs that
 * need to be used to produce the type summary.
 */
export interface AstIndex {
  imports: ImportedDecs[];
  locals: LocalDecs[];
  ambientRefs: AmbientRef[];
}

/**
 * ImportedDecs represent the declarations of a "root symbol" which are found in
 * node_modules AND are imported in the source code. These will result in `import`
 * and `export` statements in the type summary, based on if they are used locally
 * or just re-exported.
 */
export interface ImportedDecs {
  type: 'imported decs';

  /**
   * The root symbol which is imported from node_modules and used locally or exported
   * by the indexed sourceFile
   */
  readonly rootSymbol: DecSymbol;

  /**
   * The ImportDetails describing if this is a named import, what name we are importing,
   * etc.
   */
  readonly details: ImportDetails;

  /**
   * The count of local references to this rootSymbol, if this count is 0 and we are
   * working with a default or named import, then we can simply re-export this imported
   * symbol.
   */
  readonly localUsageCount: number;

  /**
   * An imported symbol can be exported more than once, so we support an array of export
   * details here and ensure that each of these exports are recreated in the type summary
   */
  exports: ExportDetails[];
}

/**
 * AmbientRef objects describe references to root symbols which were never imported
 * but are in the node_modules directory. These symbols might be placed there via
 * `lib` or `types` configs in the ts project, but it doesn't really matter to us,
 * we just need to know that this name is "reserved" and none of our declarations
 * can re-use or override this name with different meaning.
 */
export interface AmbientRef {
  type: 'ambient ref';

  /**
   * The root symbol which is referenced
   */
  readonly rootSymbol: DecSymbol;

  /**
   * The name that this root symbol is referenced by, which should be reserved
   * for this ambient type in the type summary file.
   */
  readonly name: string;
}

/**
 * LocalDecs represent the different rootSymbols which will be declared locally in
 * the type summary. They are either declarations copied from the .d.ts files, or
 * namespaces which are synthesized to represent imported namespaces.
 */
export type LocalDecs = CopiedDecs | NamespaceDec;

/**
 * A NamespaceDec represents a synthetic namepace which needs to be created in the
 * type summary to power a namespace import in the source types.
 */
export interface NamespaceDec {
  type: 'namespace dec';

  /**
   * The root symbol that points to the source file we will synthesize with this namespace
   */
  readonly rootSymbol: DecSymbol;

  /**
   * The sourceFile node which we will synthesize with this namespace, extracted
   * from rootSymbol.declarations[0] for ease of access and so we can validate
   * the shape of the symbol once.
   */
  readonly sourceFile: ts.SourceFile;

  /**
   * The members that the eventual namespace will need to have, and the rootSymbols that
   * each member will reference/export from the namespace
   */
  readonly members: Map<string, DecSymbol>;

  /**
   * If this namespace is exported then this will be set to ExportDetails. We don't
   * know if it is exported until all references to this specific rootSymbol are
   * traversed, so `exported` can't be read only and is only defined at the end of indexing.
   */
  exported: ExportDetails | undefined;
}

/**
 * CopiedDecs objects represent declarations for a "root symbol" which need to be
 * copied into the resulting "type sumary" from the .d.ts files.
 */
export interface CopiedDecs {
  type: 'copied decs';

  /**
   * The root symbol which is declared by the `decs`
   */
  readonly rootSymbol: DecSymbol;

  /**
   * The AST nodes which declare this root symbol
   */
  readonly decs: ExportableDec[];

  /**
   * If these declarations are exported then this will be set to ExportDetails. We don't
   * know if these decs are exported until all references to this specific rootSymbol are
   * traversed, so `exported` can't be read only and is only defined at the end of indexing.
   */
  exported: ExportDetails | undefined;
}
