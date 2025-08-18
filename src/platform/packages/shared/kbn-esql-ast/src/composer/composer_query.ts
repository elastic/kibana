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
import { processTemplateHoles } from './util';
import { Builder } from '../builder';
import type { ESQLAstQueryExpression } from '../types';
import type {
  ComposerQueryTagHole,
  ComposerSortShorthand,
  EsqlRequest,
  ComposerQueryTag,
} from './types';

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
   * Appends a new `LIMIT` command to the query. Equivalent to calling
   * `.pipe` with a `LIMIT` command.
   *
   * @param limit The limit to apply to the query.
   * @returns The updated ComposerQuery instance.
   */
  public limit = (limit: number): ComposerQuery => {
    return this.pipe`LIMIT ${limit}`;
  };

  /**
   * Specifies the columns to keep in the result set. Appends a `KEEP` command.
   * Equivalent to calling `.pipe` with a `KEEP` command.
   *
   * ```typescript
   * query.pipe`KEEP {['order', 'id']}`; // KEEP order.id
   * ```
   *
   * Columns can be a list of column names. To specify nested columns, use the
   * shorthand syntax `['user', 'name']` for `user.name`.
   *
   * For example:
   *
   * ```typescript
   * query.keep('my-column', ['order', 'id']); // KEEP `my-column`, order.id
   * ```
   *
   * Column name parts are automatically escaped if they contain special
   * characters.
   *
   * @param column The first column to keep.
   * @param columns Additional columns to keep.
   * @returns The updated ComposerQuery instance.
   */
  public readonly keep = (
    column: string | synth.SynthColumnShorthand,
    ...columns: Array<string | synth.SynthColumnShorthand>
  ): ComposerQuery => {
    const nodes = [column, ...columns].map((name) => {
      return Builder.expression.column(name);
    });

    return this.pipe`KEEP ${nodes}`;
  };

  /**
   * Specifies the columns to sort by. Appends a `SORT` command. Equivalent to
   * calling `.pipe` with a `SORT` command.
   *
   * ```typescript
   * query.pipe `SORT order.id,
   *   order.date DESC, user.name NULLS LAST`;
   * ```
   *
   * Order conditions are specified as a 3-tuple [column, order, nulls].
   * `column` can be specified as a string or as an array of column parts.
   *
   * For example:
   *
   * ```typescript
   * query.sort([['order', 'id'], 'ASC', 'NULLS FIRST']);
   *   // SORT order.id ASC NULLS FIRST
   * ```
   *
   * If you your column is not nested, you can simply pass a string:
   *
   * ```typescript
   * query.sort(['column', '', 'NULLS FIRST']); // SORT column NULLS FIRST
   * query.sort('abc'); // SORT abc
   * ```
   *
   * @param expression The primary sort expression.
   * @param expressions Additional sort expressions.
   * @returns The updated ComposerQuery instance.
   */
  public readonly sort = (
    expression: ComposerSortShorthand,
    ...expressions: ComposerSortShorthand[]
  ): ComposerQuery => {
    const nodes = ([expression, ...expressions] as ComposerSortShorthand[]).map((shorthand) => {
      const [column, order = '', nulls = ''] = Array.isArray(shorthand)
        ? shorthand
        : [shorthand, '', ''];
      const columnNode = Builder.expression.column(column);
      const orderNode = Builder.expression.order(columnNode, { order, nulls });

      return orderNode;
    });

    return this.pipe`SORT ${nodes}`;
  };

  public readonly where: ComposerQueryTag = (templateOrQuery: unknown, ...holes: unknown[]) => {
    const tag = ((_templateOrQuery, ..._holes: ComposerQueryTagHole[]) => {
      if (Array.isArray(_holes)) processTemplateHoles(_holes, this.params);

      const expression = synth.exp(
        _templateOrQuery as TemplateStringsArray,
        ...(_holes as synth.SynthTemplateHole[])
      );

      return this.pipe`WHERE ${expression}`;
    }) as ComposerQueryTag;

    if (Array.isArray(templateOrQuery)) {
      return tag(templateOrQuery as any, ...(holes as ComposerQueryTagHole[]));
    }

    return tag as any;
  };

  public inlineParams(): this {
    // TODO: Replace all param AST nodes. Throws if there is not enough values?
    throw new Error('not implemented');
  }

  public command() {
    // TODO: Select a command from the query.
    throw new Error('not implemented');
  }

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
