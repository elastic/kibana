/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import {
  Logger,
  isAliasSymbol,
  hasIdentifierName,
  describeNode,
  describeSymbol,
  CliError,
  SetMap,
} from '@kbn/type-summarizer-core';

import {
  toExportableDec,
  isExportableDec,
  assertDecSymbol,
  DecSymbol,
  isDecSymbol,
  toDecSymbol,
  getSymbolDeclarations,
  getImportDetails,
  ImportDetails,
} from '../ts_nodes';
import { AmbientRef } from './ambient_ref';
import { CounterMap } from '../counter_map';
import { SourceFileMapper } from '../source_file_mapper';

import { ExportDetails, getExportDetails } from './export_details';
import { CopiedDecs } from './copied_decs';
import { NamespaceDec } from './namespace_dec';
import { ImportedDecs } from './imported_decs';

export type LocalDecs = CopiedDecs | NamespaceDec;
const COMMENT_TRIM = /^(\s+)(\/\*|\*|\/\/)/;

export interface SourceSnippet {
  type: 'source';
  value: string;
}
export interface ExportSnippet {
  type: 'export';
  noExportRequiresDeclare: boolean;
}
export interface IdentifierSnippet {
  type: 'indentifier';
  rootSymbol: DecSymbol;
  identifier: ts.Identifier;
  text: string;
  structural: boolean;
}
export type Snippet = SourceSnippet | ExportSnippet | IdentifierSnippet;

export class AstIndexer {
  constructor(
    private readonly typeChecker: ts.TypeChecker,
    private readonly sources: SourceFileMapper,
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
      return new CopiedDecs(rootSymbol, decs);
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
      return new AmbientRef(externalRootSymbol, aliases[0].getName());
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
      (id) => new ImportedDecs(externalRootSymbol, id, exports, localUsageCount)
    );
  }

  private resolveSymbol(alias: ts.Symbol, source?: ts.Node): DecSymbol {
    return this.log.verboseStep('resolveSymbol()', alias, () => {
      const root = isAliasSymbol(alias) ? this.typeChecker.getAliasedSymbol(alias) : alias;

      if (!isDecSymbol(root)) {
        const importDetails = [...(alias.declarations ?? []), ...(source ? [source] : [])].flatMap(
          (d) => getImportDetails(d) ?? []
        );

        if (importDetails.length) {
          throw new CliError(
            `unable to find declarations for symbol imported from "${
              importDetails[0].req
            }". If this is an external module, make sure is it listed in the type dependencies for this package. If it's internal then make sure that TypeScript understands the types of the imported value. Imported: ${describeNode(
              importDetails[0].node
            )}`
          );
        }

        throw new Error('expected symbol to have declarations');
      }

      return root;
    });
  }

  private findStructuralIdentifiers(root: ts.Node): Set<ts.Identifier> {
    const queue = new Set([root]);
    const identifiers = new Set<ts.Identifier>();

    for (const node of queue) {
      if (isExportableDec(node)) {
        identifiers.add(node.name);
      }

      if (
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeLiteralNode(node) ||
        ts.isEnumDeclaration(node)
      ) {
        for (const member of node.members) {
          if (hasIdentifierName(member)) {
            identifiers.add(member.name);
          }
        }
      }
    }

    return identifiers;
  }

  private doesIdentifierResolveToLocalDeclaration(id: ts.Identifier) {
    const rootSymbol = this.resolveSymbol(this.getSymbolForIdentifier(id));
    for (const dec of rootSymbol.declarations) {
      if (!this.sources.isExternal(dec)) {
        return true;
      }
    }

    return false;
  }

  private findReferencedIdentifiers(root: ts.Node): Set<ts.Identifier> {
    const queue = new Set([root]);
    const identifiers = new Set<ts.Identifier>();

    for (const node of queue) {
      // ImportTypeNode's are inline `import('...').Type` nodes which TS often injects for inferred return types
      // often time these return types are for identifiers from node_modules which we will maintain, since the
      // node modules will be available for the summary. If the imported symbol resolves to local code though
      // we need to grab the referenced identifier and replace the whole ImportTypeNode with a local reference
      // after the declarations for that symbol are included in the summary
      if (ts.isImportTypeNode(node)) {
        // iterate the type arguments of ImportTypeNode
        if (node.typeArguments) {
          for (const arg of node.typeArguments) {
            queue.add(arg);
          }
        }

        if (node.qualifier) {
          // if the qualifier resolves to a local declaration then count it as an identifier, later
          // on we replace the parent node of identifiers inside or `ImportTypeNode`s
          if (ts.isIdentifier(node.qualifier)) {
            if (this.doesIdentifierResolveToLocalDeclaration(node.qualifier)) {
              identifiers.add(node.qualifier);
            }
            continue;
          }

          if (ts.isQualifiedName(node.qualifier) && ts.isIdentifier(node.qualifier.left)) {
            if (this.doesIdentifierResolveToLocalDeclaration(node.qualifier.left)) {
              identifiers.add(node.qualifier.left);
            }
            continue;
          }
        }

        throw new Error(
          `unable to find relevant identifier in ImportTypeNode.qualifier ${describeNode(node)}`
        );
      }

      const ignores: ts.Node[] = [];

      // ignore parameter/property names, names aren't ever references to other declarations AFAIK
      if (hasIdentifierName(node)) {
        ignores.push(node.name);
      }

      // ignore the source name of destructured params ie. X in `function foo({ X: Foo }: Type)`
      if (ts.isBindingElement(node) && node.propertyName) {
        ignores.push(node.propertyName);
      }

      // ignore parameter names in type predicates ie. X in `(foo: any): X is Bar`
      if (ts.isTypePredicateNode(node)) {
        ignores.push(node.parameterName);
      }

      // ignore identifiers in "QualifiedName" nodes, which are found in TypeReferences like
      // `semver.SemVer`, we don't need to treat `SemVer` as a ref because we're capturing `semver`
      if (ts.isQualifiedName(node) && ts.isIdentifier(node.right)) {
        ignores.push(node.right);
      }

      node.forEachChild((child) => {
        if (ignores.includes(child)) {
          return;
        }

        if (ts.isIdentifier(child)) {
          identifiers.add(child);
        } else {
          queue.add(child);
        }
      });
    }

    return identifiers;
  }

  private findReferencedSymbols(root: ts.Node): ts.Symbol[] {
    return [...this.findReferencedIdentifiers(root)].map((id) => this.getSymbolForIdentifier(id));
  }

  private getSymbolForIdentifier(id: ts.Identifier) {
    const symbol = this.typeChecker.getSymbolAtLocation(id);
    if (!symbol) {
      throw new Error(`unable to find symbol for ${describeNode(id)}`);
    }

    return symbol;
  }

  /**
   * This method determines all the relevant metadata about the exports of
   * a specific sourcefile. It indexes all the local declarations, imported
   * declarations, and ambient refs that should end up in the public type
   * summary file.
   */
  indexExports(sourceFile: ts.SourceFile) {
    return this.log.step('indexExports()', sourceFile.fileName, () => {
      const sourceFileSymbol = this.typeChecker.getSymbolAtLocation(sourceFile);
      if (!sourceFileSymbol) {
        throw new Error('sourceFile symbol for source file not found');
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
       * external symbols when we are created ImportedDecs.
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
        return this.log.verboseStep('indexSymbol', symbol, () => {
          if (indexedSymbols.has(symbol)) {
            return;
          }
          indexedSymbols.add(symbol);

          const rootSymbol = this.resolveSymbol(symbol);
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
              const ns = new NamespaceDec(
                rootSymbol,
                firstDec,
                new Map<string, DecSymbol>(exports.map((s) => [s.name, this.resolveSymbol(s)]))
              );
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
                  const refRoot = this.resolveSymbol(refSymbol);
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
        const rootSymbol = this.resolveSymbol(exportSymbol);

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

  private getVariableDeclarationList(node: ts.VariableDeclaration) {
    const list = node.parent;
    if (!ts.isVariableDeclarationList(list)) {
      throw new Error(
        `expected parent of variable declaration to be a VariableDeclarationList ${describeNode(
          list
        )}`
      );
    }
    return list;
  }

  private getSourceWithLeadingComments(node: ts.Node) {
    // variable declarations regularly have leading comments but they're two-parents up, so we have to handle them separately
    if (!ts.isVariableDeclaration(node)) {
      return node.getFullText();
    }

    const list = this.getVariableDeclarationList(node);
    if (list.declarations.length > 1) {
      return node.getFullText();
    }

    const statement = list.parent;
    if (!ts.isVariableStatement(statement)) {
      throw new Error('expected parent of VariableDeclarationList to be a VariableStatement');
    }

    return statement.getFullText();
  }

  private getLeadingComments(node: ts.Node): Snippet[] {
    const fullText = this.getSourceWithLeadingComments(node);
    const ranges = ts.getLeadingCommentRanges(fullText, 0);
    if (!ranges) {
      return [];
    }

    return ranges.flatMap((range) => {
      const comment = fullText
        .slice(range.pos, range.end)
        .split('\n')
        .map((line) => {
          const match = line.match(COMMENT_TRIM);
          if (!match) {
            return line;
          }

          const [, spaces, type] = match;
          return line.slice(type === '*' ? spaces.length - 1 : spaces.length);
        })
        .map((line) => `${line}`)
        .join('\n');

      if (comment.startsWith('/// <reference')) {
        return [];
      }

      return {
        type: 'source',
        value: comment + (range.hasTrailingNewLine ? '\n' : ''),
      };
    });
  }

  /**
   * Converts an AST node to a list of Snippet objects which are one of several types:
   *  a) SourceSnippet: a bit or source code text
   *  b) ExportSnippet: a placeholder for either where an existing export modifier was found
   *      or where an export modifier should be injected if the node should be exported "inline"
   *  c) IdentifierSnippet: a snippet describing an identifier in the source, which might need
   *      to be renamed based on the names determined for the final public type summary file.
   */
  toSnippets(root: ts.Node): Snippet[] {
    const snippets: Snippet[] = this.getLeadingComments(root);

    const getIdStart = (id: ts.Identifier) =>
      ts.isImportTypeNode(id.parent)
        ? id.parent.getStart()
        : ts.isQualifiedName(id.parent) && ts.isImportTypeNode(id.parent.parent)
        ? id.parent.parent.getStart()
        : id.getStart();
    const getIdEnd = (id: ts.Identifier) =>
      ts.isImportTypeNode(id.parent)
        ? id.parent.getEnd()
        : ts.isQualifiedName(id.parent) && ts.isImportTypeNode(id.parent.parent)
        ? id.parent.parent.getEnd()
        : id.getEnd();

    const structural = this.findStructuralIdentifiers(root);
    const identifiers = Array.from(
      new Set([...structural, ...this.findReferencedIdentifiers(root)])
    ).sort((a, b) => getIdStart(a) - getIdStart(b));

    const source = root.getText();
    const sourceStart = root.getStart();
    const sourceEnd = sourceStart + source.length;
    let cursor = sourceStart;

    // if there is text from the source between our current position and some other position
    // then copy it into the result and update our current position to that position
    const maybeSlurpTo = (until: number) => {
      if (cursor < until) {
        snippets.push({
          type: 'source',
          value: source.slice(cursor - sourceStart, until - sourceStart),
        });
        cursor = until;
      }
    };

    // Either replace the existing export with a placeholder, or inject an export placeholder before
    // the root nodes own text so we know where to put the export if needed
    const exportMod = root.modifiers?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    // when TS prints a function declaration to the .d.ts file with an `export` keyword, it doesn't need to be
    // `declare`d, so it sometimes skips it. If we end up striping the `export` keyword we need to put `declare`
    // in it's place so that the `.d.ts` syntax is valid
    const noExportRequiresDeclare =
      (ts.isFunctionDeclaration(root) || ts.isClassDeclaration(root)) &&
      !root.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword);

    if (exportMod) {
      const modStart = exportMod.getStart();
      const modEnd = exportMod.getEnd();
      maybeSlurpTo(modStart);

      snippets.push({
        type: 'export',
        noExportRequiresDeclare,
      });

      // export is always followed by a space, so skip the space too
      cursor = modEnd + 1;
    } else {
      const rootStart = root.getStart();
      maybeSlurpTo(rootStart);

      snippets.push({
        type: 'export',
        noExportRequiresDeclare,
      });
      cursor = rootStart;
    }

    // inject a `const`, `let`, or `var` before variable declarations
    if (ts.isVariableDeclaration(root) && ts.isVariableDeclarationList(root.parent)) {
      // eslint-disable-next-line no-bitwise
      if (root.parent.flags & ts.NodeFlags.Const) {
        snippets.push({
          type: 'source',
          value: 'declare const ',
        });
        // eslint-disable-next-line no-bitwise
      } else if (root.parent.flags & ts.NodeFlags.Let) {
        snippets.push({
          type: 'source',
          value: 'declare let ',
        });
      } else {
        snippets.push({
          type: 'source',
          value: 'declare var ',
        });
      }
    }

    for (const identifier of identifiers) {
      const start = getIdStart(identifier);
      const end = getIdEnd(identifier);
      maybeSlurpTo(start);

      snippets.push({
        type: 'indentifier',
        identifier,
        text: identifier.getText(),
        rootSymbol: this.resolveSymbol(this.getSymbolForIdentifier(identifier), identifier),
        structural: structural.has(identifier),
      });

      cursor = end;
    }

    maybeSlurpTo(sourceEnd);

    return snippets;
  }
}
