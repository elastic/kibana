/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

import { Logger, isAliasSymbol, CliError, describeNode } from '@kbn/type-summarizer-core';
import { DecSymbol, isDecSymbol } from './ts_nodes';
import { getImportDetails } from './import_details';

/**
 * Wrapper class around utilities for resolving symbols and producing meaningful errors when those
 * symbols can't be resolved properly.
 */
export class SymbolResolver {
  constructor(private readonly typeChecker: ts.TypeChecker, private readonly log: Logger) {}

  getForIdentifier(id: ts.Identifier) {
    return this.log.verboseStep('symbols.getForIdentifier()', id, () => {
      const symbol = this.typeChecker.getSymbolAtLocation(id);
      if (!symbol) {
        throw new Error(`unable to find symbol for ${describeNode(id)}`);
      }

      return symbol;
    });
  }

  toRootSymbol(alias: ts.Symbol, source?: ts.Node): DecSymbol {
    return this.log.verboseStep('symbols.toRootSymbol()', alias, () => {
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
}
