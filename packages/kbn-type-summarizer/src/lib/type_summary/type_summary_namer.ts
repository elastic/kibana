/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { AstIndex } from '../ast_index';

const INVALID_NAMES = ['default', 'import', 'export'];

/**
 * Class which is reponsible for managing the list of used names and assigning
 * new names to "root symbols".
 */
export class TypeSummaryNamer {
  public readonly rootDecsSymbols = new Set<ts.Symbol>();
  private readonly usedNames = new Set<string>();
  private readonly namesBySymbol = new Map<ts.Symbol, string>();

  constructor(index: AstIndex) {
    for (const ref of index.ambientRefs) {
      this.usedNames.add(ref.name);
      this.namesBySymbol.set(ref.rootSymbol, ref.name);
    }

    for (const l of index.locals) {
      this.rootDecsSymbols.add(l.rootSymbol);
      if (l.exported?.type === 'named') {
        // assign export name to this root symbol, if possible
        if (this.usedNames.has(l.exported.name)) {
          throw new Error(`multiple exports using the name ${l.exported.name}`);
        }

        this.usedNames.add(l.exported.name);
        this.namesBySymbol.set(l.rootSymbol, l.exported.name);
      }
    }
    for (const i of index.imports) {
      this.rootDecsSymbols.add(i.rootSymbol);
    }
  }

  get(rootSymbol: ts.Symbol, nameFromSource: string) {
    if (!this.rootDecsSymbols.has(rootSymbol)) {
      return nameFromSource;
    }

    const existing = this.namesBySymbol.get(rootSymbol);
    if (existing !== undefined) {
      return existing;
    }

    let counter = 0;
    let name = nameFromSource;
    while (this.usedNames.has(name) || INVALID_NAMES.includes(name)) {
      name = `${nameFromSource}_${++counter}`;
    }

    this.usedNames.add(name);
    this.namesBySymbol.set(rootSymbol, name);
    return name;
  }
}
