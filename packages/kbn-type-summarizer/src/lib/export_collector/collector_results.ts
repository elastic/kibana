/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { ValueNode, DecSymbol } from '../ts_nodes';
import { ResultValue } from './result_value';
import { ImportedSymbol } from './imported_symbol';
import { Reference, ReferenceKey } from './reference';
import { SourceMapper } from '../source_mapper';
import { ExportInfo } from '../export_info';

export type CollectorResult =
  | Reference
  | { type: 'imports'; imports: ImportedSymbol[] }
  | ResultValue;

export class CollectorResults {
  importedSymbols = new Set<ImportedSymbol>();

  nodes: ResultValue[] = [];
  nodesByAst = new Map<ValueNode, ResultValue>();

  constructor(private readonly sourceMapper: SourceMapper) {}

  addNode(exportInfo: ExportInfo | undefined, node: ValueNode) {
    const existing = this.nodesByAst.get(node);
    if (existing) {
      existing.exportInfo ||= exportInfo;
      return;
    }

    const result = new ResultValue(exportInfo, node);
    this.nodesByAst.set(node, result);
    this.nodes.push(result);
  }

  addImportFromNodeModules(
    exportInfo: ExportInfo | undefined,
    symbol: DecSymbol,
    moduleId: string
  ) {
    const imp = ImportedSymbol.fromSymbol(symbol, moduleId);
    imp.exportInfo ||= exportInfo;
    this.importedSymbols.add(imp);
  }

  private getReferencesFromNodes() {
    // collect the references from all the sourcefiles of all the resulting nodes
    const sourceFiles = new Set<ts.SourceFile>();
    for (const { node } of this.nodes) {
      sourceFiles.add(this.sourceMapper.getSourceFile(node));
    }

    const references: Record<ReferenceKey, Set<string>> = {
      lib: new Set(),
      types: new Set(),
    };
    for (const sourceFile of sourceFiles) {
      for (const ref of sourceFile.libReferenceDirectives) {
        references.lib.add(ref.fileName);
      }
      for (const ref of sourceFile.typeReferenceDirectives) {
        references.types.add(ref.fileName);
      }
    }

    return [
      ...Array.from(references.lib).map((name) => new Reference('lib', name)),
      ...Array.from(references.types).map((name) => new Reference('types', name)),
    ];
  }

  getAll(): CollectorResult[] {
    return [
      ...this.getReferencesFromNodes(),
      { type: 'imports', imports: Array.from(this.importedSymbols) },
      ...this.nodes,
    ];
  }
}
