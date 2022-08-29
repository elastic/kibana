/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { describeNode, Logger } from '@kbn/type-summarizer-core';
import { DecSymbol } from './ts_nodes';
import { AstTraverser } from './ast_traverser';
import { SymbolResolver } from './symbol_resolver';

const COMMENT_TRIM = /^(\s+)(\/\*|\*|\/\/)/;

/**
 * A Snippet which represents an arbitrary bit of source code. The `value`
 * of these snippets will be included verbatim in the type summary output
 */
export interface SourceSnippet {
  type: 'source';
  value: string;
}

/**
 * A Snippet which represents an existing `export` modifier, or the location where
 * one should exist if it needs to exist. When printing the `Snippet`s to
 * the type summary file we will determine if the structure bring printed
 * should be inline-exported, and if so replace this snippet with the
 * relevant export/export-type keyword(s). If the structure shouldn't be
 * exported inline then we will simply ignore this snippet.
 */
export interface ExportSnippet {
  type: 'export';
  noExportRequiresDeclare: boolean;
}

/**
 * A Snippet which represents an identifier in the source. These snippets will
 * be replaced with `SourceNode` objects in the type summary output so that
 * the `.map` file can be generated which maps the identifiers to their original
 * source location.
 */
export interface IdentifierSnippet {
  type: 'indentifier';
  rootSymbol: DecSymbol;
  identifier: ts.Identifier;
  text: string;
  structural: boolean;
}

export type Snippet = SourceSnippet | ExportSnippet | IdentifierSnippet;

/**
 * The DtsSnipper is responsible for taking the source text of an AST node
 * and converting it into an array of `Snippet` objects, which allow us to
 * reuse the code structure from `.d.ts` produced by TS but replace specific
 * snippets of that text with different values or `SourceNode`s from the
 * `source-map` library which allows is how we produce source-maps for our
 * type summary.
 */
export class DtsSnipper {
  constructor(
    private readonly traverse: AstTraverser,
    private readonly symbols: SymbolResolver,
    private readonly log: Logger
  ) {}

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
   * Converts an AST node to a list of `Snippet` objects
   */
  toSnippets(root: ts.Node): Snippet[] {
    return this.log.verboseStep('snipper.toSnippets()', root, () => {
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

      const structural = this.traverse.findStructuralIdentifiers(root);
      const identifiers = Array.from(
        new Set([...structural, ...this.traverse.findReferencedIdentifiers(root)])
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
          rootSymbol: this.symbols.toRootSymbol(
            this.symbols.getForIdentifier(identifier),
            identifier
          ),
          structural: structural.has(identifier),
        });

        cursor = end;
      }

      maybeSlurpTo(sourceEnd);

      return snippets;
    });
  }
}
