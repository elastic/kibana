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
import { processTemplateHoles, validateParamName } from './util';
import { Builder } from '../builder';
import type { ESQLAstQueryExpression, ESQLCommand, ESQLNamedParamLiteral } from '../types';
import type {
  ComposerColumnShorthand,
  ComposerQueryTagHole,
  ComposerSortShorthand,
  EsqlRequest,
  QueryCommandTag,
  QueryCommandTagParametrized,
} from './types';
import { Walker } from '../walker';

export class ComposerQuery {
  constructor(
    public readonly ast: ESQLAstQueryExpression,
    protected readonly params: Map<string, unknown> = new Map()
  ) {}

  /**
   * Create a template tag function which can be parametrized:
   *
   * ```typescript
   * const more = 42;
   *
   * // Parameter specified as ${{more}} in the template:
   * query.pipe `FROM index | WHERE foo > ${{more}}`;
   *
   * // Parameter specified ahead of the template:
   * query.pipe({more}) `FROM index | WHERE foo > ?more`;
   * ```
   */
  private readonly _createCommandTag = (
    synthCommandTag: synth.SynthMethod<ESQLCommand>
  ): QueryCommandTag =>
    ((templateOrQueryOrParamValues, ...rest: unknown[]) => {
      const tagOrGeneratorWithParams =
        (initialParamValues: Record<string, unknown>): QueryCommandTagParametrized =>
        (templateOrQuery: any, ...holes: unknown[]) => {
          const params: Record<string, unknown> = { ...initialParamValues };
          let command: ESQLCommand;

          if (typeof templateOrQuery === 'string') {
            const moreParamValues =
              typeof holes[0] === 'object' && !Array.isArray(holes[0]) ? holes[0] : {};

            Object.assign(params, moreParamValues);

            command = synthCommandTag(templateOrQuery);
          } else {
            if (Array.isArray(holes))
              processTemplateHoles(holes as ComposerQueryTagHole[], this.params);

            command = synthCommandTag(
              templateOrQuery as TemplateStringsArray,
              ...(holes as synth.SynthTemplateHole[])
            );
          }

          for (const [name, value] of Object.entries(params)) {
            validateParamName(name);
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

  public readonly pipe: QueryCommandTag = this._createCommandTag(synth.cmd);

  /**
   * Appends a `CHANGE_POINT` command to detect change points in time series data.
   * Equivalent to calling `.pipe` with a `CHANGE_POINT` command.
   *
   * The `CHANGE_POINT` command is used to identify points in time where the statistical
   * properties of a time series change significantly.
   *
   * ```typescript
   * // Basic usage - detect change points in a column
   * query.change_point('metric_value');
   * // Result: CHANGE_POINT metric_value
   *
   * // Specify a key column to group by
   * query.change_point('metric_value', { on: 'timestamp' });
   * // Result: CHANGE_POINT metric_value ON timestamp
   *
   * // Specify output column names for type and p-value
   * query.change_point('metric_value', { as: ['change_type', 'p_value'] });
   * // Result: CHANGE_POINT metric_value AS change_type, p_value
   *
   * // Use all options together
   * query.change_point('metric_value', {
   *   on: 'timestamp',
   *   as: ['change_type', 'p_value']
   * });
   * // Result: CHANGE_POINT metric_value ON timestamp AS change_type, p_value
   * ```
   *
   * Columns can be specified as strings or arrays for nested columns:
   *
   * ```typescript
   * query.change_point(['metrics', 'cpu'], {
   *   on: ['timestamp', 'field'],
   *   as: [['change', 'type'], ['p', 'value']]
   * });
   * // Result: CHANGE_POINT metrics.cpu ON timestamp.field AS change.type, p.value
   * ```
   *
   * @param value The column to analyze for change points. Can be a string
   *     column name or an array of column parts for nested columns
   *     (e.g., ['metrics', 'cpu'] for 'metrics.cpu').
   * @param options Configuration options for the change point detection.
   * @param options.on Optional column to use as the key for grouping or
   *     ordering data. Can be a string or array of column parts.
   * @param options.as Optional tuple specifying the output column names for the change type
   *     and p-value. Must be a 2-element array where the first element is the column name
   *     for the change type and the second is for the p-value.
   * @returns The updated ComposerQuery instance.
   */
  public readonly change_point = (
    value: ComposerColumnShorthand,
    options: {
      on?: ComposerColumnShorthand;
      as?: [type: ComposerColumnShorthand, pvalue: ComposerColumnShorthand];
    } = {}
  ): ComposerQuery => {
    const val = Builder.expression.column(value);
    const key = options.on ? Builder.expression.column(options.on) : void 0;
    const type = options.as ? Builder.expression.column(options.as[0]) : void 0;
    const pvalue = options.as ? Builder.expression.column(options.as[1]) : void 0;

    if (type && pvalue && key) {
      return this.pipe`CHANGE_POINT ${val} ON ${key} AS ${type}, ${pvalue}`;
    }

    if (type && pvalue) {
      return this.pipe`CHANGE_POINT ${val} AS ${type}, ${pvalue}`;
    }

    if (key) {
      return this.pipe`CHANGE_POINT ${val} ON ${key}`;
    }

    return this.pipe`CHANGE_POINT ${val}`;
  };

  /**
   * Appends a `DISSECT` command to extract structured data from unstructured text.
   * Equivalent to calling `.pipe` with a `DISSECT` command.
   *
   * The `DISSECT` command uses pattern matching to extract key-value pairs from text
   * fields based on a delimiter-based pattern. It's particularly useful for parsing
   * log entries, CSV data, or other structured text formats.
   *
   * Read more: {@link https://www.elastic.co/docs/reference/query-languages/esql/commands/processing-commands#esql-dissect}.
   *
   * ```typescript
   * // Basic usage - extract fields from a text column
   * query.dissect('message', '%{timestamp} - %{level} - %{msg}');
   * // Result: DISSECT message "%{timestamp} - %{level} - %{msg}"
   *
   * // Extract from nested column
   * query.dissect(['log', 'entry'], '%{date} %{time} [%{level}] %{message}');
   * // Result: DISSECT log.entry "%{date} %{time} [%{level}] %{message}"
   *
   * // Using APPEND_SEPARATOR option
   * query.dissect('data', '%{field1},%{field2},%{field3}', {
   *   APPEND_SEPARATOR: ','
   * });
   * // Result: DISSECT data "%{field1},%{field2},%{field3}" APPEND_SEPARATOR = ","
   * ```
   *
   * Examples with different patterns:
   *
   * ```typescript
   * // CSV-like data
   * query.dissect('csv_data', '%{name},%{age},%{city}');
   *
   * // Log entries with timestamps
   * query.dissect('log_line', '[%{timestamp}] %{level}: %{message}');
   *
   * // Key-value pairs
   * query.dissect('kv_data', 'user=%{user} action=%{action} result=%{result}');
   *
   * // Skip unwanted parts
   * query.dissect('complex_log', '%{date} %{time} %{} [%{level}] %{message}');
   * ```
   *
   * @param input The column containing the text to dissect. Can be a string
   *     column name or an array of column parts for nested columns
   *     (e.g., ['log', 'message'] for 'log.message').
   * @param pattern The dissect pattern that defines how to extract fields
   *     from the input text.
   * @param options Configuration options for the dissect operation.
   * @param options.APPEND_SEPARATOR Optional separator string to use when
   *     appending multiple values to the same field name.
   * @returns The updated ComposerQuery instance.
   */
  public readonly dissect = (
    input: ComposerColumnShorthand,
    pattern: string,
    options: {
      APPEND_SEPARATOR?: string;
    } = {}
  ): ComposerQuery => {
    const inputNode = Builder.expression.column(input);

    if (options.APPEND_SEPARATOR) {
      return this
        .pipe`DISSECT ${inputNode} ${pattern} APPEND_SEPARATOR = ${options.APPEND_SEPARATOR}`;
    }

    return this.pipe`DISSECT ${inputNode} ${pattern}`;
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
    column: ComposerColumnShorthand,
    ...columns: Array<ComposerColumnShorthand>
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
    column: ComposerColumnShorthand,
    ...columns: Array<ComposerColumnShorthand>
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

  /**
   * Appends a `WHERE` command to filter rows based on a condition. Equivalent to
   * calling `.pipe` with a `WHERE` command.
   *
   * ```typescript
   * query.where `foo > 42 AND bar < 24`;
   * ```
   *
   * You can use parameters in the WHERE condition:
   *
   * ```typescript
   * const threshold = 42;
   * query.where `foo > ${{threshold}}`;
   * ```
   *
   * You can also parametrize the template by providing parameters upfront:
   *
   * ```typescript
   * query.where({threshold: 42}) `foo > ?threshold`;
   * ```
   *
   * Or use string syntax with parameters:
   *
   * ```typescript
   * query.where('foo > ?threshold', {threshold: 42});
   * ```
   *
   * @param templateOrQuery The WHERE condition as a template literal or string.
   * @param holes Template holes for parameter substitution when using template
   *     literals.
   * @returns The updated ComposerQuery instance.
   */
  public readonly where = this._createCommandTag(((
    templateOrQuery: TemplateStringsArray | string,
    ...holes: unknown[]
  ) => {
    if (typeof templateOrQuery === 'string') {
      return synth.cmd(`WHERE ${templateOrQuery}`);
    }

    const expression = synth.exp(
      templateOrQuery as TemplateStringsArray,
      ...(holes as synth.SynthTemplateHole[])
    );

    return synth.cmd`WHERE ${expression}`;
  }) as synth.SynthMethod<ESQLCommand>);

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
