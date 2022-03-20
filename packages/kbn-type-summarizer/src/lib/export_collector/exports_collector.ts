/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

import { Logger } from '../log';
import {
  assertExportedValueNode,
  isExportedValueNode,
  DecSymbol,
  assertDecSymbol,
  toDecSymbol,
  ExportFromDeclaration,
  isExportFromDeclaration,
  isAliasSymbol,
} from '../ts_nodes';

import { ExportInfo } from '../export_info';
import { CollectorResults } from './collector_results';
import { SourceMapper } from '../source_mapper';
import { isNodeModule } from '../is_node_module';

interface ResolvedNmImport {
  type: 'import_from_node_modules';
  symbol: DecSymbol;
  moduleId: string;
}
interface ResolvedSymbol {
  type: 'symbol';
  symbol: DecSymbol;
}

export class ExportCollector {
  constructor(
    private readonly log: Logger,
    private readonly typeChecker: ts.TypeChecker,
    private readonly sourceFile: ts.SourceFile,
    private readonly dtsDir: string,
    private readonly sourceMapper: SourceMapper
  ) {}

  private getParentImport(
    symbol: DecSymbol
  ): ts.ImportDeclaration | ExportFromDeclaration | undefined {
    for (const node of symbol.declarations) {
      let cursor: ts.Node = node;
      while (true) {
        if (ts.isImportDeclaration(cursor) || isExportFromDeclaration(cursor)) {
          return cursor;
        }

        if (ts.isSourceFile(cursor)) {
          break;
        }

        cursor = cursor.parent;
      }
    }
  }

  private getAllChildSymbols(
    node: ts.Node,
    results = new Set<DecSymbol>(),
    seen = new Set<ts.Node>()
  ) {
    node.forEachChild((child) => {
      const childSymbol = this.typeChecker.getSymbolAtLocation(child);
      if (childSymbol) {
        results.add(toDecSymbol(childSymbol));
      }
      if (!seen.has(child)) {
        seen.add(child);
        this.getAllChildSymbols(child, results, seen);
      }
    });
    return results;
  }

  private resolveAliasSymbolStep(alias: ts.Symbol): DecSymbol {
    // get the symbol this symbol references
    const aliased = this.typeChecker.getImmediateAliasedSymbol(alias);
    if (!aliased) {
      throw new Error(`symbol [${alias.escapedName}] is an alias without aliased symbol`);
    }
    assertDecSymbol(aliased);
    return aliased;
  }

  private getImportFromNodeModules(symbol: DecSymbol): undefined | ResolvedNmImport {
    const parentImport = this.getParentImport(symbol);
    if (parentImport && ts.isStringLiteral(parentImport.moduleSpecifier)) {
      // this symbol is within an import statement, is it an import from a node_module? first
      // we resolve the import alias to it's source symbol, which we will show us the file that
      // the import resolves to
      const aliased = this.resolveAliasSymbolStep(symbol);
      const targetPaths = [
        ...new Set(aliased.declarations.map((d) => this.sourceMapper.getSourceFile(d).fileName)),
      ];
      if (targetPaths.length > 1) {
        throw new Error('importing a symbol from multiple locations is unsupported at this time');
      }

      const targetPath = targetPaths[0];
      if (isNodeModule(this.dtsDir, targetPath)) {
        return {
          type: 'import_from_node_modules',
          symbol,
          moduleId: parentImport.moduleSpecifier.text,
        };
      }
    }
  }

  private resolveAliasSymbol(alias: DecSymbol): ResolvedNmImport | ResolvedSymbol {
    let symbol = alias;

    while (isAliasSymbol(symbol)) {
      const nmImport = this.getImportFromNodeModules(symbol);
      if (nmImport) {
        return nmImport;
      }

      symbol = this.resolveAliasSymbolStep(symbol);
    }

    return {
      type: 'symbol',
      symbol,
    };
  }

  private traversedSymbols = new Set<DecSymbol>();
  private collectResults(
    results: CollectorResults,
    exportInfo: ExportInfo | undefined,
    symbol: DecSymbol
  ): void {
    const seen = this.traversedSymbols.has(symbol);
    if (seen && !exportInfo) {
      return;
    }
    this.traversedSymbols.add(symbol);

    const source = this.resolveAliasSymbol(symbol);
    if (source.type === 'import_from_node_modules') {
      results.addImportFromNodeModules(exportInfo, source.symbol, source.moduleId);
      return;
    }

    symbol = source.symbol;
    if (seen) {
      for (const node of symbol.declarations) {
        assertExportedValueNode(node);
        results.addNode(exportInfo, node);
      }
      return;
    }

    const globalDecs: ts.Declaration[] = [];
    const localDecs: ts.Declaration[] = [];
    for (const node of symbol.declarations) {
      const sourceFile = this.sourceMapper.getSourceFile(node);
      (isNodeModule(this.dtsDir, sourceFile.fileName) ? globalDecs : localDecs).push(node);
    }

    if (globalDecs.length) {
      this.log.debug(
        `Ignoring ${globalDecs.length} global declarations for "${source.symbol.escapedName}"`
      );
    }

    for (const node of localDecs) {
      // iterate through the child nodes to find nodes we need to export to make this useful
      const childSymbols = this.getAllChildSymbols(node);
      childSymbols.delete(symbol);

      for (const childSymbol of childSymbols) {
        this.collectResults(results, undefined, childSymbol);
      }

      if (isExportedValueNode(node)) {
        results.addNode(exportInfo, node);
      }
    }
  }

  run(): CollectorResults {
    const results = new CollectorResults(this.sourceMapper);

    const moduleSymbol = this.typeChecker.getSymbolAtLocation(this.sourceFile);
    if (!moduleSymbol) {
      this.log.warn('Source file has no symbol in the type checker, is it empty?');
      return results;
    }

    for (const symbol of this.typeChecker.getExportsOfModule(moduleSymbol)) {
      assertDecSymbol(symbol);
      this.collectResults(results, ExportInfo.fromSymbol(symbol), symbol);
    }

    return results;
  }
}
