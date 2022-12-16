/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';
import Path from 'path';
import { SetMap } from './set_map';

/**
 * Does this AST node have a name which is an identifier?
 */
export function hasIdentifierName(node: any): node is { name: ts.Identifier } {
  return typeof node === 'object' && node !== null && node.name && ts.isIdentifier(node.name);
}

/**
 * Is this symbol pointing to another symbol?
 */
export function isAliasSymbol(symbol: ts.Symbol) {
  // eslint-disable-next-line no-bitwise
  return Boolean(symbol.flags & ts.SymbolFlags.Alias);
}

/**
 * Get a human readable string describing a symbol, requires that symbols have a declaration
 * which will be passed to describeNode()
 */
export function describeSymbol(symbol: ts.Symbol, cwd?: string) {
  if (!symbol.declarations) {
    return 'undeclared symbol';
  }

  return `Symbol(${describeNode(symbol.declarations[0], cwd)})`;
}

function describeNodeLocation(node: ts.Node, cwd = process.cwd()) {
  const sourceFile = node.getSourceFile();
  const loc = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false));
  return `${Path.relative(cwd, sourceFile.fileName)}:${loc.line + 1}:${loc.character + 1}`;
}

let syntaxMap: SetMap<ts.SyntaxKind, string> | undefined;
function getSyntaxMap() {
  if (syntaxMap) {
    return syntaxMap;
  }

  syntaxMap = new SetMap();
  for (const [key, value] of Object.entries(ts.SyntaxKind)) {
    if (typeof value === 'number') {
      syntaxMap.add(value, key);
    }
  }

  return syntaxMap;
}

/**
 * Get a human readable name of the syntax "kind". TS nodes use enums for their "kind" field
 * which makes it tricky to know what you're looking at, and the `ts.SyntaxKind` map is lossy
 * because many enum members have the same numeric value. To get around this we convert the
 * ts.SyntaxKind map into a `SetMap` which puts all the syntax kind names for a given number
 * into a set and allows us to report all possible type names from `getKindName()`
 */
export function getKindName(node: ts.Node) {
  const names = [...(getSyntaxMap().get(node.kind) ?? [])];

  if (names.length === 1) {
    return names[0];
  } else if (names.length > 1) {
    const ors = names.slice(-1);
    const last = names.at(-1);
    return `${ors.join(', ')} or ${last}`;
  }

  return 'unknown';
}

/**
 * Turn a Node instance into a string which describes the type, name, filename, and position of the node
 */
export function describeNode(node: ts.Node, cwd?: string) {
  const name = hasIdentifierName(node)
    ? ` (${node.name.text})`
    : ts.isIdentifier(node)
    ? ` (${node.text})`
    : '';

  return `ts.${getKindName(node)}${name} @ ${describeNodeLocation(node, cwd)}`;
}
