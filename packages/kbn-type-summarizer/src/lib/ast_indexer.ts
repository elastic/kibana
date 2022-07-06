/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { Logger, isAliasSymbol, describeSymbol, SetMap } from '@kbn/type-summarizer-core';

import {
  AstIndex,
  AmbientRef,
  CopiedDecs,
  ImportedDecs,
  LocalDecs,
  NamespaceDec,
} from './ast_index';

import {
  toExportableDec,
  assertDecSymbol,
  DecSymbol,
  toDecSymbol,
  getSymbolDeclarations,
} from './ts_nodes';
import { CounterMap } from './counter_map';
import { SourceFileMapper } from './source_file_mapper';
import { SymbolResolver } from './symbol_resolver';
import { AstTraverser } from './ast_traverser';
import { ImportDetails, getImportDetails } from './import_details';
import { ExportDetails, getExportDetails } from './export_details';

/**
 * The `AstIndexer` is responsible for collecting all the relevant information about the exports of
 * a sourceFile from it's AST representation.
 *
 * The #indexExports method is the primary/only interface to use the AstIndexer and where the
 * most useful documentation can be found.
 */
export class AstIndexer {
  constructor(
    private readonly typeChecker: ts.TypeChecker,
    private readonly sources: SourceFileMapper,
    private readonly symbols: SymbolResolver,
    private readonly traverse: AstTraverser,
    private readonly log: Logger
  ) {}

  private getCopiedDecs(rootSymbol: DecSymbol): CopiedDecs | null {
    const decs = rootSymbol.declarations.flatMap((dec) => {
      // filter out declarations which are of no interest, traversing back to a type parameter or a
      // function parameter, for instance, means this a symbol which is not of interest for this
      // project so we ignore them
      if (ts.isTypeParameterDeclaration(dec) || ts.isParameter(dec)) {
        return [];
      }

      if (this.sources.isExternal(dec)) {
        return [];
      }

      return toExportableDec(dec);
    });

    if (decs.length) {
      return {
        type: 'copied decs',
        decs,
        rootSymbol,
        exported: undefined,
      };
    }

    return null;
  }

  private resolveExternalRootSymbol(
    externalRootSymbol: DecSymbol,
    aliases: ts.Symbol[],
    exports: ExportDetails[] | undefined,
    localUsageCount: number
  ): ImportedDecs[] | AmbientRef {
    const imports = aliases.flatMap((alias) => {
      // traverse from the use to the symbol, stopping at the first import statement that points into the node_modules directory
      let cursor = toDecSymbol(alias);
      while (isAliasSymbol(cursor)) {
        const next = this.typeChecker.getImmediateAliasedSymbol(cursor);
        if (!next) {
          break;
        }

        // if any of the declarations of the next node are external then we have reched the stepping point that
        // takes us from our local code to the node_modules. We won't traverse any more after we collect the
        // import details of the declarations of cursoor
        const nextIsExternal = getSymbolDeclarations(next).some((d) => this.sources.isExternal(d));

        if (nextIsExternal) {
          return cursor.declarations.flatMap((d) => getImportDetails(d) ?? []);
        }

        cursor = toDecSymbol(next);
      }

      return [];
    });

    if (!imports.length) {
      return {
        type: 'ambient ref',
        rootSymbol: externalRootSymbol,
        name: aliases[0].getName(),
      };
    }

    const mergedImports: ImportDetails[] = [];
    for (const id of imports) {
      const existing = mergedImports.find(
        (d) =>
          d.req === id.req &&
          d.type === id.type &&
          (d.type === 'named' && id.type === 'named' ? d.sourceName === id.sourceName : true)
      );

      if (existing) {
        existing.typesOnly = existing.typesOnly && id.typesOnly;
      } else {
        mergedImports.push(id);
      }
    }

    if (mergedImports.length === 0) {
      return [];
    }

    return mergedImports.map(
      (id): ImportedDecs => ({
        type: 'imported decs',
        rootSymbol: externalRootSymbol,
        details: id,
        exports: exports || [],
        localUsageCount,
      })
    );
  }

  private findReferencedSymbols(root: ts.Node): ts.Symbol[] {
    return [...this.traverse.findReferencedIdentifiers(root)].map((id) =>
      this.symbols.getForIdentifier(id)
    );
  }

  /**
   * This method determines all the relevant metadata about the exports of
   * a specific `sourceFile` AST node. It indexes all the local declarations, imported
   * declarations, and ambient refs that should end up in the public type
   * summary file.
   *
   * To do this we use "symbols" from the `TypeChecker` provided by TypeScript.
   *
   *  > "symbols" in the `TypeChecker` are not related to `Symbol`s in JS.
   *
   * Symbols describe a specific sourceFile/Type/Value in the source code, and allow
   * us to understand the types referenced by specific AST nodes. For instance, we
   * can ask the `TypeChecker` for the symbol of an `Identifier` node in the AST (the
   * node type representing most named "keywords"; `a` and `foo` in `a(foo)` are both
   * `Identifiers`). Every identifier in the source code should map to a specific symbol
   * in the type system, which would be returned by the `TypeChecker`. These symbols
   * then list the "declarations" which define/declare them. This is often a `class {}`
   * or `interface {}` declaration but there are many types of declarations that could
   * have defined this symbol. Additionally, the symbol may have multiple declarations
   * if function overloads or interface extensions are used.
   *
   * Symbols can be "alias" symbols, indicating that they are declared in the source code
   * but actually point to another declaration, either by variable assignment or via
   * imports. When a type/value is imported from another file, the references to that
   * type/value use alias symbols, which are declared by the import itself but point
   * elsewhere. Thankfully, the `TypeChecker` has an API to traverse up the alias chain
   * to the "root symbol". While indexing exports we regularly use the `SymbolResolver`
   * to convert a symbol to it's `rootSymbol`, so that we can compare two references and
   * determine if they are pointing to the same underlying declarations/type/value.
   *
   * To determine the full index of exports for a source file we start by asking the
   * TypeChecker for the list of exported symbols of some sourceFile, then we traverse
   * from those symbols to their declarations. If the symbol has declarations that are
   * in node_modules, then either an `ImportedDecs` or `AmbientRef` object is added to
   * the index, depending on wether the symbol is ever found to be imported.
   *
   *    `ImportedDecs` describe how to import the declarations for that exported
   *        symbol in the type summary file.
   *    `AmbientRef` objects describe names that are expected to be declared ambiently,
   *        and therefore should be considered reserved in the type summary file.
   *
   * If any declarations for an exported symbol are local to the source code then they will
   * result in a `LocalDecs` object being added to the index. Before adding a `LocalDecs`
   * object to the index the AST of each local declaration is traversed to find
   * references to other symbols. These references cause additional `ImportedDecs`,
   * `AmbientRef`, or `LocalDecs` objects to be added to the index before the exported
   * `LocalDecs`, ensuring that referenced declarations come first in the resulting type
   * summary file and that all code referenced by the decalarations is included in the type
   * summary file.
   *
   * Once all referenced declarations are found and added to the index the exported
   * `LocalDecs` object is added to the index and the process is repeated for the next exported
   * symbol.
   *
   * To ensure that we don't end up with duplicate declarations all `LocalDecs`, `ImportedDecs`
   * and `AmbientRef` objects track the "root symbol" that they represent. Any time we
   * encounter a new symbol which might need to be added to the index it is first resolved
   * to it's root symbol to ensure we haven't already handled it.
   */
  indexExports(sourceFile: ts.SourceFile): AstIndex {
    return this.log.step('indexExports()', sourceFile.fileName, () => {
      const sourceFileSymbol = this.typeChecker.getSymbolAtLocation(sourceFile);
      if (!sourceFileSymbol) {
        throw new Error(`symbol for source file not found: ${sourceFile.fileName}`);
      }

      /**
       * all alias symbols which point to a root symbol, which allows
       * us to find all the import statements which point to an external
       * rootSymbol
       */
      const symbolAliases = new SetMap<ts.Symbol, ts.Symbol>();
      /**
       * counts the number of times a rootSymbol is used, this allows us
       * to determine if an external rootSymbol needs to be imported for
       * local usage, or just exported directly
       */
      const rootSymbolLocalUses = new CounterMap<DecSymbol>();
      /**
       * Map of the LocalDecs we have already created, allowing us to make
       * sure that we only have a single LocalDecs instance for each rootSymbol
       */
      const localDecsBySymbol = new Map<DecSymbol, LocalDecs | null>();
      /**
       * Set of all symbols we've indexed already, allowing us to freely call
       * indexSymbol() with each referenced symbol and avoid duplicating work
       */
      const indexedSymbols = new Set<ts.Symbol>();
      /**
       * Set of DecSymbols which are identified to have some external declarations
       * that need to be imported in the final TypeSummary. These will be turned
       * into ImportedDecs at the end once we have all the aliases indexed and
       * can use the aliases to determine the import statements used to get these
       * external symbols into the code.
       */
      const externalSymbols = new Set<DecSymbol>();
      /**
       * When we find a rootSymbol which is external, but there aren't any imports
       * which pull in that symbol, then we track it here as a ref to an "ambient"
       * type, like `Promise<>` from the TS lib. These refs don't end up in the type
       * summary, but they do populate the list of UsedNames to ensure that we don't
       * clobber those names with local declarations
       */
      const ambientRefsByRootSymbol = new SetMap<DecSymbol, AmbientRef>();
      /**
       * These are the symbols which are exported from the `sourceFile` being indexed
       * grouped by their rootSymbol. This allows us to get the export details for
       * external symbols when we are creating ImportedDecs.
       */
      const exportSymbolsByRootSymbols = new SetMap<DecSymbol, DecSymbol>();
      /**
       * The ordered array of LocalDecs, in the order which these decs should appear
       * in the resulting type summary file.
       */
      const localDecs: LocalDecs[] = [];

      /**
       * This function is called to update the above state with the relevant details
       * for a symbol we find as relevant to the exports of `sourceFile`. Calls itself
       * with all the internal symbols referenced by the declarations of `symbol`.
       */
      const indexSymbol = (symbol: ts.Symbol) => {
        return this.log.verboseStep('indexSymbol()', symbol, () => {
          if (indexedSymbols.has(symbol)) {
            return;
          }
          indexedSymbols.add(symbol);

          const rootSymbol = this.symbols.toRootSymbol(symbol);
          symbolAliases.add(rootSymbol, symbol);

          const existingLocalDec = localDecsBySymbol.get(rootSymbol);
          if (!existingLocalDec) {
            const [firstDec] = rootSymbol.declarations;
            // when using a namespace import for a local module, the symbol resolves to the entire
            // sourceFile imported, so we will index the sourceFile's exports and then track the
            // namespace we need to synthesize in the output and maybe export
            if (
              rootSymbol.declarations.length === 1 &&
              ts.isSourceFile(firstDec) &&
              !this.sources.isExternal(firstDec)
            ) {
              const exports = this.typeChecker.getExportsOfModule(rootSymbol);
              const ns: NamespaceDec = {
                type: 'namespace dec',
                rootSymbol,
                exported: undefined,
                members: new Map<string, DecSymbol>(
                  exports.map((s) => [s.name, this.symbols.toRootSymbol(s)])
                ),
                sourceFile: firstDec,
              };
              localDecsBySymbol.set(rootSymbol, ns);

              for (const s of exports) {
                indexSymbol(s);
              }
              localDecs.push(ns);
              return;
            }

            const locals = this.getCopiedDecs(rootSymbol);
            localDecsBySymbol.set(rootSymbol, locals);

            if (locals) {
              for (const dec of locals.decs) {
                for (const refSymbol of this.findReferencedSymbols(dec)) {
                  const refRoot = this.symbols.toRootSymbol(refSymbol);
                  rootSymbolLocalUses.incr(refRoot);
                  indexSymbol(refSymbol);
                }
              }

              localDecs.push(locals);
            }
          }

          if (rootSymbol.declarations.some((d) => this.sources.isExternal(d))) {
            externalSymbols.add(rootSymbol);
          }
        });
      };

      // iterate through the direct exports of `sourceFile` and index them
      for (const exportSymbol of this.typeChecker.getExportsOfModule(sourceFileSymbol)) {
        // convert `symbol` to a DecSymbol
        assertDecSymbol(exportSymbol);

        // mutate the state to know about this symbol
        indexSymbol(exportSymbol);

        // resolve to the rootSymbol that is being exported
        const rootSymbol = this.symbols.toRootSymbol(exportSymbol);

        // list this as an exported symbol for when we're trying to define export info for imports
        exportSymbolsByRootSymbols.add(rootSymbol, exportSymbol);

        // ensure that if LocalDecs are created for this symbol they have the necessary ExportDetails
        const local = localDecsBySymbol.get(rootSymbol);
        if (local) {
          local.exported = getExportDetails(this.typeChecker, exportSymbol);
        }
      }

      // convert the externalSymbols to ImportDecs and AmbientRefs based on whether they are imported or not
      const importedDecs = [...externalSymbols].flatMap((rootSymbol) => {
        const aliases = symbolAliases.get(rootSymbol);
        if (!aliases) {
          throw new Error(`external symbol has no aliases somehow ${describeSymbol(rootSymbol)}`);
        }

        const exportSymbols = exportSymbolsByRootSymbols.get(rootSymbol);

        const resolved =
          this.resolveExternalRootSymbol(
            rootSymbol,
            [...aliases],
            exportSymbols
              ? [...exportSymbols].map((s) => getExportDetails(this.typeChecker, s))
              : undefined,
            rootSymbolLocalUses.get(rootSymbol)
          ) ?? [];

        if (Array.isArray(resolved)) {
          return resolved;
        }

        ambientRefsByRootSymbol.add(resolved.rootSymbol, resolved);
        return [];
      });

      return {
        imports: importedDecs,
        locals: localDecs,
        ambientRefs: [...ambientRefsByRootSymbol.values()].flatMap((group) => {
          const names = new Set<string>();
          return [...group].filter((g) => {
            if (names.has(g.name)) {
              return false;
            }

            names.add(g.name);
            return true;
          });
        }),
      };
    });
  }
}
