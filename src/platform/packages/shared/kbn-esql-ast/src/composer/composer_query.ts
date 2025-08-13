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
import type { ESQLAstQueryExpression, ESQLNamedParamLiteral } from '../types';
import type {
  ComposerQueryTagHole,
  ComposerSortShorthand,
  EsqlRequest,
  ComposerQueryTag,
  ComposerQueryGenerator,
  QueryCommandTag,
  QueryCommandTagParametrized,
} from './types';
import { Walker } from '../walker';

export class ComposerQuery {
  constructor(
    public readonly ast: ESQLAstQueryExpression,
    protected readonly params: Map<string, unknown> = new Map()
  ) {}

  public readonly pipe: QueryCommandTag = ((templateOrQueryOrParamValues, ...rest: unknown[]) => {
    const tagOrGeneratorWithParams =
      (initialParamValues: Record<string, unknown>): QueryCommandTagParametrized =>
      (templateOrQuery: any, ...holes: unknown[]) => {
        if (typeof templateOrQuery === 'string') {
          const moreParamValues =
            typeof holes[0] === 'object' && !Array.isArray(holes[0]) ? holes[0] : {};
          const params = { ...initialParamValues, ...moreParamValues };
          const command = synth.cmd(templateOrQuery);

          for (const [name, value] of Object.entries(params)) {
            const exists = this.params.has(name);

            if (exists) {
              // If a parameter with the same name already exists, we rename it
              // as somebody might have already used it in the query in a
              // different command.
              let newName: string;
              while (true) {
                newName = `${name}_${this.params.size}`;
                if (!this.params.has(newName)) break;
              }

              this.params.set(newName, value);

              const nodes = Walker.matchAll(command, {
                type: 'literal',
                literalType: 'param',
                value: name,
              }) as ESQLNamedParamLiteral[];

              for (const node of nodes) {
                node.value = newName;
              }
            } else {
              this.params.set(name, value);
            }
          }

          this.ast.commands.push(command);
        } else {
          if (Array.isArray(holes))
            processTemplateHoles(holes as ComposerQueryTagHole[], this.params);

          const command = synth.cmd(
            templateOrQuery as TemplateStringsArray,
            ...(holes as synth.SynthTemplateHole[])
          );

          this.ast.commands.push(command);
        }

        return this;
      };

    if (
      !!templateOrQueryOrParamValues &&
      typeof templateOrQueryOrParamValues === 'object' &&
      !Array.isArray(templateOrQueryOrParamValues)
    ) {
      return tagOrGeneratorWithParams(
        templateOrQueryOrParamValues as Record<string, unknown>
      ) as QueryCommandTagParametrized;
    }

    const parametrized = tagOrGeneratorWithParams({});

    if (typeof templateOrQueryOrParamValues === 'string') {
      return parametrized(templateOrQueryOrParamValues, rest[0] as Record<string, unknown>);
    } else {
      return parametrized(
        templateOrQueryOrParamValues as TemplateStringsArray,
        ...(rest as ComposerQueryTagHole[])
      );
    }
  }) as QueryCommandTag;

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
   * Specifies the columns to drop from the result set. Appends a `DROP` command.
   * Equivalent to calling `.pipe` with a `DROP` command.
   *
   * ```typescript
   * query.pipe`DROP {['order', 'id']}`; // DROP order.id
   * ```
   *
   * Columns can be a list of column names. To specify nested columns, use the
   * shorthand syntax `['user', 'name']` for `user.name`.
   *
   * For example:
   *
   * ```typescript
   * query.drop('my-column', ['order', 'id']); // DROP `my-column`, order.id
   * ```
   *
   * Column name parts are automatically escaped if they contain special
   * characters.
   *
   * @param column The first column to drop.
   * @param columns Additional columns to drop.
   * @returns The updated ComposerQuery instance.
   */
  public readonly drop = (
    column: string | synth.SynthColumnShorthand,
    ...columns: Array<string | synth.SynthColumnShorthand>
  ): ComposerQuery => {
    const nodes = [column, ...columns].map((name) => {
      return Builder.expression.column(name);
    });

    return this.pipe`DROP ${nodes}`;
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

  public readonly where: ComposerQueryTag & ComposerQueryGenerator<ComposerQuery> = (
    templateOrQuery: string | TemplateStringsArray,
    ...holes: unknown[]
  ) => {
    if (typeof templateOrQuery === 'string') {
      const paramsValues: Record<string, unknown> | undefined = holes[0];
    }

    if (Array.isArray(holes)) processTemplateHoles(holes, this.params);

    const expression = synth.exp(
      templateOrQuery as TemplateStringsArray,
      ...(holes as synth.SynthTemplateHole[])
    );

    return this.pipe`WHERE ${expression}`;
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
   * Returns a record of all parameters used in the query, where keys are
   * parameter names and values are the corresponding parameter values.
   */
  public getParams(): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (const [name, value] of this.params.entries()) {
      params[name] = value;
    }

    return params;
  }

  public setParam(name: string, value: unknown): this {
    if (this.params.has(name)) {
      throw new Error(`Parameter "${name}" already exists in the query.`);
    }

    this.params.set(name, value);
    return this;
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
