/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import { SourceNode, CodeWithSourceMap } from 'source-map';

import * as Path from './path';
import { findKind } from './ts_nodes';
import { SourceMapper } from './source_mapper';
import { ExportInfo } from './export_info';
import { CollectorResult, ImportedSymbol } from './export_collector';

type SourceNodes = Array<string | SourceNode>;
const COMMENT_TRIM = /^(\s+)(\/\*|\*|\/\/)/;

export class Printer {
  private readonly tsPrint = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    noEmitHelpers: true,
    omitTrailingSemicolon: false,
    removeComments: true,
  });

  constructor(
    private readonly sourceMapper: SourceMapper,
    private readonly results: CollectorResult[],
    private readonly outputPath: string,
    private readonly mapOutputPath: string,
    private readonly sourceRoot: string,
    private readonly strict: boolean
  ) {}

  async print(): Promise<CodeWithSourceMap> {
    const file = new SourceNode(
      null,
      null,
      null,
      this.results.flatMap((r) => {
        if (r.type === 'reference') {
          return `/// <reference ${r.key}="${r.name}" />\n`;
        }

        if (r.type === 'imports') {
          return this.printImports(r.imports);
        }

        return this.toSourceNodes(r.node, r.exportInfo);
      })
    );

    const outputDir = Path.dirname(this.outputPath);
    const mapOutputDir = Path.dirname(this.mapOutputPath);

    const output = file.toStringWithSourceMap({
      file: Path.relative(mapOutputDir, this.outputPath),
      sourceRoot: this.sourceRoot,
    });

    const nl = output.code.endsWith('\n') ? '' : '\n';
    const sourceMapPathRel = Path.relative(outputDir, this.mapOutputPath);
    output.code += `${nl}//# sourceMappingURL=${sourceMapPathRel}`;

    return output;
  }

  private printImports(imports: ImportedSymbol[]) {
    const importLines: string[] = [];
    const exportLines: string[] = [];

    for (const imp of imports) {
      const from = ` from '${imp.moduleId}';`;

      if (imp.remoteName === 'default') {
        importLines.push(
          [imp.isTypeOnly ? `import type ` : 'import ', imp.localName, from].join('')
        );
      } else if (imp.remoteName === '*') {
        importLines.push(
          [imp.isTypeOnly ? `import type * as ` : 'import * as ', imp.localName, from].join('')
        );
      } else {
        importLines.push(
          [
            imp.isTypeOnly ? 'import type { ' : 'import { ',
            imp.localName ? `${imp.remoteName} as ${imp.localName}` : imp.remoteName,
            ' }',
            from,
          ].join('')
        );
      }

      if (imp.exportInfo) {
        exportLines.push(`${imp.exportInfo.type} { ${imp.localName || imp.remoteName} };`);
      }
    }

    const lines = [
      ...importLines,
      ...(importLines.length && exportLines.length ? [''] : []),
      ...exportLines,
    ];
    return lines.length ? lines.join('\n') + '\n\n' : '';
  }

  private getDeclarationKeyword(node: ts.Declaration) {
    if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
      return 'function';
    }

    if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      return 'type';
    }

    if (node.kind === ts.SyntaxKind.ClassDeclaration) {
      return 'class';
    }

    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      return 'interface';
    }

    if (ts.isVariableDeclaration(node)) {
      return this.getVariableDeclarationType(node);
    }
  }

  private printModifiers(exportInfo: ExportInfo | undefined, node: ts.Declaration) {
    const flags = ts.getCombinedModifierFlags(node);
    const modifiers: string[] = [];
    if (exportInfo) {
      modifiers.push(exportInfo.type);
    }
    if (flags & ts.ModifierFlags.Default) {
      modifiers.push('default');
    }
    if (flags & ts.ModifierFlags.Abstract) {
      modifiers.push('abstract');
    }
    if (flags & ts.ModifierFlags.Private) {
      modifiers.push('private');
    }
    if (flags & ts.ModifierFlags.Public) {
      modifiers.push('public');
    }
    if (flags & ts.ModifierFlags.Static) {
      modifiers.push('static');
    }
    if (flags & ts.ModifierFlags.Readonly) {
      modifiers.push('readonly');
    }
    if (flags & ts.ModifierFlags.Const) {
      modifiers.push('const');
    }
    if (flags & ts.ModifierFlags.Async) {
      modifiers.push('async');
    }

    const keyword = this.getDeclarationKeyword(node);
    if (keyword) {
      modifiers.push(keyword);
    }

    return `${modifiers.join(' ')} `;
  }

  private printNode(node: ts.Node) {
    return this.tsPrint.printNode(
      ts.EmitHint.Unspecified,
      node,
      this.sourceMapper.getSourceFile(node)
    );
  }

  private ensureNewline(string: string): string;
  private ensureNewline(string: SourceNodes): SourceNodes;
  private ensureNewline(string: string | SourceNodes): string | SourceNodes {
    if (typeof string === 'string') {
      return string.endsWith('\n') ? string : `${string}\n`;
    }

    const end = string.at(-1);
    if (end === undefined) {
      return [];
    }

    const valid = (typeof end === 'string' ? end : end.toString()).endsWith('\n');
    return valid ? string : [...string, '\n'];
  }

  private getMappedSourceNode(node: ts.Node, code?: string) {
    return this.sourceMapper.getSourceNode(node, code ?? node.getText());
  }

  private getVariableDeclarationList(node: ts.VariableDeclaration) {
    const list = node.parent;
    if (!ts.isVariableDeclarationList(list)) {
      const kind = findKind(list);
      throw new Error(
        `expected parent of variable declaration to be a VariableDeclarationList, got [${kind}]`
      );
    }
    return list;
  }

  private getVariableDeclarationType(node: ts.VariableDeclaration) {
    const flags = ts.getCombinedNodeFlags(this.getVariableDeclarationList(node));
    if (flags & ts.NodeFlags.Const) {
      return 'const';
    }
    if (flags & ts.NodeFlags.Let) {
      return 'let';
    }
    return 'var';
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

  private getLeadingComments(node: ts.Node, indentWidth = 0): string[] {
    const fullText = this.getSourceWithLeadingComments(node);
    const ranges = ts.getLeadingCommentRanges(fullText, 0);
    if (!ranges) {
      return [];
    }
    const indent = ' '.repeat(indentWidth);

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
        .map((line) => `${indent}${line}`)
        .join('\n');

      if (comment.startsWith('/// <reference')) {
        return [];
      }

      return comment + (range.hasTrailingNewLine ? '\n' : '');
    });
  }

  private printTypeParameters(
    node:
      | ts.ClassDeclaration
      | ts.InterfaceDeclaration
      | ts.FunctionDeclaration
      | ts.TypeAliasDeclaration
  ) {
    const typeParams = node.typeParameters;

    if (!typeParams || !typeParams.length) {
      return '';
    }

    return `<${typeParams.map((p) => this.printNode(p)).join(', ')}>`;
  }

  private toSourceNodes(node: ts.Node, exportInfo?: ExportInfo): SourceNodes {
    switch (node.kind) {
      case ts.SyntaxKind.LiteralType:
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.BigIntLiteral:
      case ts.SyntaxKind.NumericLiteral:
      case ts.SyntaxKind.StringKeyword:
        return [this.printNode(node)];
    }

    if (ts.isFunctionDeclaration(node)) {
      // we are just trying to replace the name with a sourceMapped node, so if there
      // is no name just return the source
      if (!node.name) {
        return [node.getFullText()];
      }

      return [
        this.getLeadingComments(node),
        this.printModifiers(exportInfo, node),
        this.getMappedSourceNode(node.name, exportInfo?.name),
        this.printTypeParameters(node),
        `(${node.parameters.map((p) => p.getFullText()).join(', ')})`,
        node.type ? [': ', this.printNode(node.type), ';'] : ';',
        '\n',
      ].flat();
    }

    if (ts.isInterfaceDeclaration(node)) {
      const text = node.getText();
      const name = node.name.getText();
      const nameI = text.indexOf(name);
      if (nameI === -1) {
        throw new Error(`printed version of interface does not include name [${name}]: ${text}`);
      }
      return [
        ...this.getLeadingComments(node),
        text.slice(0, nameI),
        this.getMappedSourceNode(node.name, name),
        text.slice(nameI + name.length),
        '\n',
      ];
    }

    if (ts.isVariableDeclaration(node)) {
      return [
        ...this.getLeadingComments(node),
        this.printModifiers(exportInfo, node),
        this.getMappedSourceNode(node.name),
        ...(node.type ? [': ', this.printNode(node.type)] : []),
        ';\n',
      ];
    }

    if (ts.isUnionTypeNode(node)) {
      return node.types.flatMap((type, i) =>
        i > 0 ? [' | ', ...this.toSourceNodes(type)] : this.toSourceNodes(type)
      );
    }

    if (ts.isTypeAliasDeclaration(node)) {
      return [
        ...this.getLeadingComments(node),
        this.printModifiers(exportInfo, node),
        this.getMappedSourceNode(node.name),
        this.printTypeParameters(node),
        ' = ',
        this.ensureNewline(this.toSourceNodes(node.type)),
      ].flat();
    }

    if (ts.isClassDeclaration(node)) {
      return [
        ...this.getLeadingComments(node),
        this.printModifiers(exportInfo, node),
        node.name ? this.getMappedSourceNode(node.name) : [],
        this.printTypeParameters(node),
        ' {\n',
        node.members.flatMap((m) => {
          const memberText = m.getText();

          if (ts.isConstructorDeclaration(m)) {
            return `  ${memberText}\n`;
          }

          if (!m.name) {
            return `  ${memberText}\n`;
          }

          const nameText = m.name.getText();
          const pos = memberText.indexOf(nameText);
          if (pos === -1) {
            return `  ${memberText}\n`;
          }

          const left = memberText.slice(0, pos);
          const right = memberText.slice(pos + nameText.length);
          const nameNode = this.getMappedSourceNode(m.name, nameText);

          return [...this.getLeadingComments(m, 2), `  `, left, nameNode, right, `\n`];
        }),
        '}\n',
      ].flat();
    }

    if (!this.strict) {
      return [this.ensureNewline(this.printNode(node))];
    } else {
      throw new Error(`unable to print export type of kind [${findKind(node)}]`);
    }
  }
}
