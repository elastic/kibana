/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { printTree } from 'tree-dump';
import * as synth from '../synth';
import { BasicPrettyPrinter, WrappingPrettyPrinter } from '../pretty_print';
import { ESQLAstQueryExpression } from '../types';
import { processTemplateHoles } from './util';
import type { ComposerQueryTagHole, EsqlRequest } from './types';

export class ComposerQuery {
  constructor(
    public readonly ast: ESQLAstQueryExpression,
    protected readonly params: Map<string, unknown> = new Map()
  ) {}

  public readonly pipe: {
    (template: TemplateStringsArray, ...holes: ComposerQueryTagHole[]): ComposerQuery;
    (query: string): ComposerQuery;
  } = (templateOrQuery, ...holes: ComposerQueryTagHole[]): this => {
    if (Array.isArray(holes)) processTemplateHoles(holes, this.params);

    const command = synth.cmd(
      templateOrQuery as TemplateStringsArray,
      ...(holes as synth.SynthTemplateHole[])
    );
    this.ast.commands.push(command);

    return this;
  };

  /**
   * Prints the query to a string in a specified format.
   *
   * @param format The format of the printed query. Can be 'wrapping' for a
   *     more readable format or 'basic' for a single line.
   * @returns The printed query string.
   */
  public print(format: 'wrapping' | 'basic' = 'wrapping'): string {
    return format === 'wrapping'
      ? WrappingPrettyPrinter.print(this.ast)
      : BasicPrettyPrinter.print(this.ast);
  }

  /**
   * Converts the query to an ESQL request format as an object, which
   * Elasticsearch `POST /_query` API expects.
   *
   * @returns An object representing the ESQL request, including the query string
   *   and parameters.
   */
  public toRequest(): EsqlRequest {
    return {
      query: this.print('basic'),
      params: [...this.params.entries()].map(([name, value]) => ({
        [name]: value,
      })),
    };
  }

  /**
   * Used for debugging and logging purposes, this method provides a
   * string representation of the ComposerQuery instance.
   *
   * Simply cast the `query` instance to a string to get a formatted output.
   *
   * ```typescript
   * const query = esql`
   *   FROM kibana_ecommerce_index
   *     | WHERE foo > 42 AND bar < 24
   *     | EVAL a = 123 | LIMIT 10`;
   *
   * console.log(query + '');
   * // Output:
   * // ComposerQuery
   * // ├─ query
   * // │  └─ FROM kibana_ecommerce_index
   * // │       | WHERE foo > 42 AND bar < 24
   * // │       | EVAL a = 123
   * // │       | LIMIT 10
   * // │
   * // └─ params
   * //    └─ {}
   * ```
   */
  public toString(): string {
    return (
      'ComposerQuery' +
      printTree('', [
        (tab) => {
          return (
            'query' +
            printTree(tab, [
              (tab2) => {
                const query = this.print();
                const queryTabbed = query.replace(/\n/g, '\n' + tab2);
                return queryTabbed;
              },
            ])
          );
        },
        () => '',
        (tab) => {
          return (
            'params' +
            printTree(
              tab,
              this.params.size
                ? [...this.params.entries()].map(([name, value]) => (tab2) => {
                    return `${name}: ${JSON.stringify(value)}`;
                  })
                : [() => '{}']
            )
          );
        },
      ])
    );
  }
}
