/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { ValueNode, ExportFromDeclaration } from '../ts_nodes';
import { ResultValue } from './result_value';
import { ImportedSymbols } from './imported_symbols';
import { Reference, ReferenceKey } from './reference';
import { SourceMapper } from '../source_mapper';

export type CollectorResult = Reference | ImportedSymbols | ResultValue;

export class CollectorResults {
  imports: ImportedSymbols[] = [];
  importsByPath = new Map<string, ImportedSymbols>();

  nodes: ResultValue[] = [];
  nodesByAst = new Map<ValueNode, ResultValue>();

  constructor(private readonly sourceMapper: SourceMapper) {}

  addNode(exported: boolean, node: ValueNode) {
    const existing = this.nodesByAst.get(node);
    if (existing) {
      existing.exported = existing.exported || exported;
      return;
    }

    const result = new ResultValue(exported, node);
    this.nodesByAst.set(node, result);
    this.nodes.push(result);
  }

  ensureExported(node: ValueNode) {
    this.addNode(true, node);
  }

  addImport(
    exported: boolean,
    node: ts.ImportDeclaration | ExportFromDeclaration,
    symbol: ts.Symbol
  ) {
    const literal = node.moduleSpecifier;
    if (!ts.isStringLiteral(literal)) {
      throw new Error('import statement with non string literal module identifier');
    }

    const existing = this.importsByPath.get(literal.text);
    if (existing) {
      existing.symbols.push(symbol);
      return;
    }

    const result = new ImportedSymbols(exported, node, [symbol]);
    this.importsByPath.set(literal.text, result);
    this.imports.push(result);
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
    return [...this.getReferencesFromNodes(), ...this.imports, ...this.nodes];
  }
}
