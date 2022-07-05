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
   * Converts an AST node to a list of Snippet objects which are one of several types:
   *  a) SourceSnippet: a bit or source code text
   *  b) ExportSnippet: a placeholder for either where an existing export modifier was found
   *      or where an export modifier should be injected if the node should be exported "inline"
   *  c) IdentifierSnippet: a snippet describing an identifier in the source, which might need
   *      to be renamed based on the names determined for the final public type summary file.
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
