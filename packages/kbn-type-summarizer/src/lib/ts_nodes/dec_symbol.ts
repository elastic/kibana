/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

export type DecSymbol = ts.Symbol & {
  declarations: NonNullable<ts.Symbol['declarations']>;
};

export function isDecSymbol(symbol: ts.Symbol): symbol is DecSymbol {
  return !!symbol.declarations && symbol.declarations.length > 0;
}

export function assertDecSymbol(symbol: ts.Symbol): asserts symbol is DecSymbol {
  if (!isDecSymbol(symbol)) {
    throw new Error(
      // TODO: expand this error message, maybe ignore symbols which resolve to non DecSymbols
      `Expected symbol to have declarations. This might be caused by importing JS in a TS file. Using \`@ts-expect-error\` or \`@ts-ignore\` is not enough...`
    );
  }
}

export function toDecSymbol(symbol: ts.Symbol): DecSymbol {
  assertDecSymbol(symbol);
  return symbol;
}

export function getSymbolDeclarations(symbol: ts.Symbol) {
  assertDecSymbol(symbol);
  return symbol.declarations;
}
