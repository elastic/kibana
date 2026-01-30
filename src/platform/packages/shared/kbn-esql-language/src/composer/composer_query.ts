/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { printTree } from 'tree-dump';
import * as synth from './synth';
import { BasicPrettyPrinter, WrappingPrettyPrinter } from '../pretty_print';
import { composerQuerySymbol, processTemplateHoles, validateParamName } from './util';
import { Builder } from '../ast/builder';
import type {
  ESQLAstExpression,
  ESQLAstHeaderCommand,
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLNamedParamLiteral,
} from '../types';
import type {
  ComposerColumnShorthand,
  ComposerQueryTagHole,
  ComposerRenameShorthand,
  ComposerSortShorthand,
  ComposerSourceShorthand,
  EsqlRequest,
  QueryCommandTag,
  QueryCommandTagParametrized,
} from './types';
import { Walker } from '../ast/walker';
import {
  isBinaryExpression,
  isBooleanLiteral,
  isColumn,
  isDoubleLiteral,
  isFunctionExpression,
  isHeaderCommand,
  isIdentifier,
  isIntegerLiteral,
  isProperNode,
  isStringLiteral,
} from '../ast/is';
import { replaceProperties } from '../ast/walker/helpers';
import { resolveItem } from '../ast/visitor/utils';
import { printAst } from '../shared/debug';

export class ComposerQuery {
  public readonly [composerQuerySymbol] = true;

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
    synthCommandTag: synth.SynthMethod<ESQLCommand | ESQLAstHeaderCommand>
  ): QueryCommandTag =>
    ((templateOrQueryOrParamValues, ...rest: unknown[]) => {
      const tagOrGeneratorWithParams =
        (initialParamValues: Record<string, unknown>): QueryCommandTagParametrized =>
        (templateOrQuery: any, ...holes: unknown[]) => {
          const params: Record<string, unknown> = { ...initialParamValues };
          let command: ESQLCommand | ESQLAstHeaderCommand;

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

          if (isHeaderCommand(command)) {
            this.ast.header = this.ast.header || [];
            this.ast.header.push(command);
          } else {
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
   * Appends a command to the query. This is the generic command appending method,
   * which supports all ES|QL commands. Use it similar to `esql` template tag, but
   * it adds one command at-a-time to the existing query. Use chainable calls to
   * append multiple commands.
   *
   * Example:
   *
   * ```typescript
   * // Start a new query with a source command:
   * const query = esql `FROM index`;
   *
   * // Append commands using .pipe:
   * query
   *    .pipe `WHERE field > 10`
   *    .pipe `LIMIT 100`;
   * ```
   *
   * Safely inline dynamic values using template literal holes:
   *
   * ```typescript
   * const threshold = 10;
   * query.pipe `WHERE field > ${threshold}`;
   * // WHERE field > 10
   * ```
   *
   * Or insert named parameters using `${{param}}` syntax:
   *
   * ```typescript
   * const limit = 100;
   * query.pipe `WHERE field > ${{threshold}} | LIMIT ${{limit}}`;
   * // WHERE field > ?threshold | LIMIT ?limit
   * ```
   *
   * You can also insert parameters ahead of the template:
   *
   * ```typescript
   * const limit = 100;
   * const threshold = 10;
   * query.pipe({ limit, threshold }) `WHERE field > ?threshold | LIMIT ?limit`;
   * ```
   *
   * Or specify commands as strings, and provide parameters separately:
   *
   * ```typescript
   * const limit = 100;
   * const threshold = 10;
   * query.pipe('WHERE field > ?threshold | LIMIT ?limit', { limit, threshold });
   * ```
   */
  public readonly pipe: QueryCommandTag = this._createCommandTag(synth.cmd);

  /**
   * Appends a header command to the query. This is used to add commands like `SET`
   * to the query header. Use it exactly like {@linkcode pipe}, for example:
   *
   * ```typescript
   * const query = esql `FROM index`;
   * query.header `SET x = 10`;
   *
   * query.print(); // "SET x = 10; FROM index"
   * ```
   */
  public readonly header: QueryCommandTag = this._createCommandTag(synth.hdr);

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
    const val = synth.col(value);
    const key = options.on ? synth.col(options.on) : void 0;
    const type = options.as ? synth.col(options.as[0]) : void 0;
    const pvalue = options.as ? synth.col(options.as[1]) : void 0;

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
    const inputColumn = synth.col(input);

    if (options.APPEND_SEPARATOR) {
      return this
        .pipe`DISSECT ${inputColumn} ${pattern} APPEND_SEPARATOR = ${options.APPEND_SEPARATOR}`;
    }

    return this.pipe`DISSECT ${inputColumn} ${pattern}`;
  };

  /**
   * Appends a `GROK` command to extract structured data from unstructured text using patterns.
   * Equivalent to calling `.pipe` with a `GROK` command.
   *
   * The `GROK` command uses regular expression-based patterns to parse and extract fields
   * from text data. It's particularly powerful for parsing log files, as it combines
   * regular expressions with pre-built patterns for common data formats.
   *
   * ```typescript
   * // Basic usage - extract fields using a grok pattern
   * query.grok('message', '%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}');
   * // Result: GROK message "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}"
   *
   * // Extract from nested column
   * query.grok(['log', 'entry'], '%{COMBINEDAPACHELOG}');
   * // Result: GROK log.entry "%{COMBINEDAPACHELOG}"
   * ```
   *
   * @param input The column containing the text to parse with grok. Can be a
   *     string column name or an array of column parts for nested columns
   *     (e.g., ['log', 'message'] for 'log.message').
   * @param pattern The grok pattern that defines how to extract and name
   *     fields from the input text. Use `%{PATTERN:field_name}` syntax to
   *     extract and name fields.
   * @returns The updated ComposerQuery instance.
   */
  public readonly grok = (input: ComposerColumnShorthand, pattern: string): ComposerQuery => {
    const inputColumn = synth.col(input);

    return this.pipe`GROK ${inputColumn} ${pattern}`;
  };

  /**
   * Appends an `ENRICH` command to add data from an enrich policy to the query
   * results. Equivalent to calling `.pipe` with an `ENRICH` command.
   *
   * The `ENRICH` command allows you to add fields from an enrich policy to your query results
   * based on matching field values. Enrich policies are pre-configured datasets that can be
   * used to supplement your query data with additional context or metadata.
   *
   * See docs: {@link https://www.elastic.co/docs/reference/query-languages/esql/commands/processing-commands#esql-enrich}
   *
   * ```typescript
   * // Basic usage - enrich with a policy
   * query.enrich('user_policy');
   * // Result: ENRICH user_policy
   *
   * // Specify a match field using ON clause
   * query.enrich('geo_policy', { on: 'ip_address' });
   * // Result: ENRICH geo_policy ON ip_address
   *
   * // Select specific fields to add using WITH clause
   * query.enrich('user_policy', {
   *   with: {
   *     full_name: 'user_name',
   *     department: ['org', 'dept']
   *   }
   * });
   * // Result: ENRICH user_policy WITH full_name = user_name, department = org.dept
   *
   * // Use both ON and WITH options
   * query.enrich('geo_policy', {
   *   on: 'client_ip',
   *   with: {
   *     country: 'geo_country',
   *     city: 'geo_city'
   *   }
   * });
   * // Result: ENRICH geo_policy ON client_ip WITH country = geo_country, city = geo_city
   * ```
   *
   * @param policy The name of the enrich policy to use for enrichment.
   * @param options Configuration options for the enrich operation.
   * @param options.on Optional field to match against the enrich policy. Can be a string
   *   column name or an array of column parts for nested columns. If not specified,
   *   the policy's default match field will be used.
   * @param options.with Optional mapping of output field names to policy field names.
   *   Keys are the names for new fields in the result set, values are the field names
   *   from the enrich policy to copy. Both keys and values can use nested column syntax.
   * @returns The updated ComposerQuery instance.
   */
  public readonly enrich = (
    policy: string,
    options: {
      on?: ComposerColumnShorthand;
      with?: Record<string, ComposerColumnShorthand>;
    } = {}
  ): ComposerQuery => {
    const index = Builder.expression.source.node({ sourceType: 'policy', index: policy });
    const onArgs = options.on ? synth.col(options.on) : void 0;
    const withArgs = options.with
      ? Object.entries(options.with).reduce((acc, [key, value]) => {
          const expression = synth.exp`${synth.col(key)} = ${synth.col(value)}`;
          acc.push(expression);
          return acc;
        }, [] as ESQLAstExpression[])
      : void 0;

    if (onArgs && withArgs) {
      return this.pipe`ENRICH ${index} ON ${onArgs} WITH ${withArgs}`;
    }

    if (onArgs) {
      return this.pipe`ENRICH ${index} ON ${onArgs}`;
    }

    if (withArgs) {
      return this.pipe`ENRICH ${index} WITH ${withArgs}`;
    }

    return this.pipe`ENRICH ${index}`;
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
   * Appends a new `SAMPLE` command to the query. Equivalent to calling
   * `.pipe` with a `SAMPLE` command.
   *
   * The `SAMPLE` command randomly selects a subset of rows from the result set
   * based on the specified probability. This is useful for quickly analyzing
   * large datasets without processing the entire set of results.
   *
   * ```typescript
   * // Sample approximately 10% of the rows
   * query.sample(0.1);
   * // ... | SAMPLE 0.1 | ...
   *
   * // Sample approximately 50% of the rows
   * query.pipe `SAMPLE ${0.5}`;
   * // ... | SAMPLE 0.5 | ...
   * ```
   *
   * @param probability A number between 0 and 1 representing the fraction of
   *     rows to sample. For example, 0.1 samples approximately 10% of rows,
   *     while 0.5 samples approximately 50%.
   * @returns The updated ComposerQuery instance.
   * @throws Error if the probability is not between 0 and 1.
   */
  public sample = (probability: number): ComposerQuery => {
    if (probability < 0 || probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }

    return this.pipe`SAMPLE ${probability}`;
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
      return synth.col(name);
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
      return synth.col(name);
    });

    return this.pipe`DROP ${nodes}`;
  };

  /**
   * Appends a `MV_EXPAND` command to expand multi-valued fields into multiple
   * rows. Equivalent to calling `.pipe` with a `MV_EXPAND` command.
   *
   * ```typescript
   * query.pipe `MV_EXPAND tags`; // ... | MV_EXPAND tags | ...
   * ```
   *
   * Columns can be specified as strings or arrays for nested columns:
   *
   * ```typescript
   * query.mv_expand(['user', 'roles']); // ... | MV_EXPAND user.roles | ...
   * ```
   * @param column The column to expand.
   * @returns The updated ComposerQuery instance.
   */
  public readonly mv_expand = (column: ComposerColumnShorthand): ComposerQuery => {
    const node = synth.col(column);

    return this.pipe`MV_EXPAND ${node}`;
  };

  /**
   * Specifies renaming of columns in the result set. Appends a `RENAME` command.
   * Equivalent to calling `.pipe` with a `RENAME` command.
   *
   * ```typescript
   * query.pipe `RENAME foo = bar, baz = qux`;
   * ```
   *
   * Columns can be specified as strings or arrays for nested columns:
   *
   * ```typescript
   * query.rename(['user', 'name'], 'username');
   * // ... | RENAME user.name = username | ...
   * ```
   *
   * You can rename multiple columns at once:
   *
   * ```typescript
   * query.rename(
   *   ['user', 'name'], 'username',
   *   'addr', ['user', 'address']
   * );
   * // ... | RENAME user.name = username, addr = user.address | ...
   * ```
   *
   * @param expression The first rename expression as a tuple of [newName, oldName].
   * @param expressions Additional rename expressions.
   * @returns The updated ComposerQuery instance.
   */
  public readonly rename = (
    expression: ComposerRenameShorthand,
    ...expressions: ComposerRenameShorthand[]
  ): ComposerQuery => {
    const nodes = [expression, ...expressions].map(([to, from]) => {
      return synth.exp`${synth.col(to)} = ${synth.col(from)}`;
    });

    return this.pipe`RENAME ${nodes}`;
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
      const columnNode = synth.col(column);
      const orderNode = Builder.expression.order(columnNode, { order, nulls });

      return orderNode;
    });

    return this.pipe`SORT ${nodes}`;
  };

  /**
   * Appends a `LOOKUP JOIN` command to perform a lookup join with another index.
   * Equivalent to calling `.pipe` with a `LOOKUP JOIN` command.
   *
   * The `LOOKUP JOIN` command allows you to enrich your query results by joining
   * data from another index based on matching field values. This is useful for
   * adding context or related information from different datasets.
   *
   * ```typescript
   * // Basic usage - perform a lookup join with another index
   * query.lookup_join('other_index', 'user_id');
   * // Result: ... | LOOKUP JOIN other_index ON user_id | ...
   *
   * // Join on multiple fields
   * query.lookup_join('other_index', 'user_id', 'session_id');
   * // Result: ... | LOOKUP JOIN other_index ON user_id, session_id | ...
   *
   * // Join using a nested column
   * query.lookup_join('other_index', ['user', 'id']);
   * // Result: ... | LOOKUP JOIN other_index ON user.id | ...
   *
   * // Join with an alias
   * query.lookup_join({ index: 'other_index', alias: 'o' }, 'user_id');
   * // Result: ... | LOOKUP JOIN other_index AS o ON user_id | ...
   *
   * // Join using a qualified column
   * query.lookup_join('other_index', ['usersIndex', ['id']]);
   * // Result: ... | LOOKUP JOIN other_index ON [usersIndex].[id] | ...
   * ```
   *
   * @param lookupIndex The name of the index to join with, or an object with
   *     index and alias properties.
   * @param onFieldName The first field to join on. Can be a string column name
   *     or an array of column parts for nested columns (e.g., ['user', 'id']
   *     for 'user.id').
   * @param onFieldNames Additional fields to join on.
   * @returns The updated ComposerQuery instance.
   */
  public readonly lookup_join = (
    lookupIndex: ComposerSourceShorthand,
    onFieldName: ComposerColumnShorthand,
    ...onFieldNames: Array<ComposerColumnShorthand>
  ): ComposerQuery => {
    let lookupIndexNode;

    if (typeof lookupIndex === 'string') {
      lookupIndexNode = synth.src(lookupIndex);
    } else if ('index' in lookupIndex && 'alias' in lookupIndex) {
      lookupIndexNode = synth.srcAs(lookupIndex.index, lookupIndex.alias);
    } else {
      lookupIndexNode = lookupIndex;
    }

    const onFieldNameNodes = ([onFieldName, ...onFieldNames] as ComposerColumnShorthand[]).map(
      (shorthand) => {
        return synth.col(shorthand);
      }
    );

    return this.pipe`LOOKUP JOIN ${lookupIndexNode} ON ${onFieldNameNodes}`;
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
   * Inlines a parameter by replacing its placeholder with its actual value.
   * This operation modifies the query AST to include the literal value
   * instead of the parameter reference. See {@linkcode inlineParams} for
   * more details.
   *
   * @param name The name of the parameter to inline.
   * @returns The updated ComposerQuery instance.
   * @throws Error if the parameter does not exist or has an unsupported type.
   */
  public inlineParam(name: string): this {
    const value = this.params.get(name);

    if (value === undefined) {
      throw new Error(`Parameter "${name}" does not exist in the query.`);
    }

    Walker.replaceAll(this.ast, { type: 'literal', literalType: 'param', value: name }, (node) => {
      const param = node as ESQLNamedParamLiteral;
      const parent = Walker.parent(this.ast, node);

      if (parent && isFunctionExpression(parent) && parent.operator === node) {
        return Builder.identifier(String(value));
      } else if (
        parent &&
        isColumn(parent) &&
        parent.args.length === 1 &&
        parent.args[0] === node
      ) {
        replaceProperties(parent, synth.exp(String(value)));

        return { ...node };
      } else if (param.paramKind === '??') {
        if (parent && isColumn(parent)) {
          return Builder.identifier(String(value));
        }

        return synth.exp(String(value));
      } else {
        if (parent && isColumn(parent)) {
          return Builder.identifier(String(value));
        }
        switch (typeof value) {
          case 'string': {
            return synth.str(value);
          }
          case 'number': {
            return synth.num(value);
          }
          case 'boolean': {
            return synth.bool(value);
          }
          case 'object': {
            if (Array.isArray(value)) {
              return synth.list(value as synth.ListPrimitive[]);
            }
            break;
          }
        }
      }

      throw new Error(`Cannot inline parameter "${name}" of unsupported type.`);
    });

    this.params.delete(name);

    return this;
  }

  /**
   * Inlines all parameters in the query by replacing parameter placeholders with
   * their actual values directly in the AST. This operation modifies the query
   * to contain literal values instead of parameter references and clears the
   * parameter map.
   *
   * This method is useful when you want to convert a parameterized query into
   * a static query with all values embedded directly in the query text.
   *
   * ```typescript
   * // Create a parameterized query
   * const query = esql`FROM logs | WHERE user == ${{ userName: 'admin' }} | LIMIT ${{ limit: 100 }}`;
   *
   * console.log(query.print());
   * // FROM logs | WHERE user == ?userName | LIMIT ?limit
   *
   * console.log(query.getParams());
   * // { userName: 'admin', limit: 100 }
   *
   * // Inline all parameters
   * query.inlineParams();
   *
   * console.log(query.print());
   * // FROM logs | WHERE user == "admin" | LIMIT 100
   *
   * console.log(query.getParams());
   * // {} (empty - all parameters have been inlined)
   * ```
   *
   * **Note:** This operation is irreversible. Once parameters are inlined,
   * they cannot be extracted back into parameter form. The parameter map
   * will be empty after this operation.
   *
   * **Supported parameter types:**
   * - `string` - Converted to string literals
   * - `number` - Converted to numeric literals
   * - `boolean` - Converted to boolean literals
   * - Column (field) names (when used with `??` param syntax)
   * - Nested column name parts (both, `?` and `??` param syntax)
   * - Function names (both, `?` and `??` param syntax)
   *
   * @returns The updated ComposerQuery instance with all parameters inlined.
   * @throws Error if any parameter has an unsupported type that cannot be inlined.
   */
  public inlineParams(): this {
    for (const name of [...this.params.keys()]) {
      this.inlineParam(name);
    }
    return this;
  }

  /**
   * Inserts a SET instruction into the query header.
   *
   * SET instructions are pseudo-commands that set configuration values for the query.
   * They must appear before the main query and are separated by semicolons.
   *
   * ```typescript
   * // Add a single SET instruction
   * query.addSetCommand('a', 'foo');
   * // Result: SET a = "foo"; <original query>
   *
   * // Add multiple SET instructions
   * query.addSetCommand('b', 123);
   * // Result: SET a = "foo"; SET b = 123; <original query>
   * ```
   *
   * @param name The setting name (identifier) to set.
   * @param value The value to assign to the setting (string, number, or boolean).
   * @returns The updated ComposerQuery instance.
   */
  public addSetCommand(name: string, value: string | number | boolean): this {
    this.header`SET ${synth.kwd(name)} = ${value}`;

    return this;
  }

  /**
   * Removes a SET instruction from the query header by setting name.
   *
   * ```typescript
   * // Remove a specific SET instruction
   * query.removeSetCommand('a');
   * // Removes: SET a = "foo";
   * ```
   *
   * @param name The setting name (identifier) to remove.
   * @returns The updated ComposerQuery instance.
   */
  public removeSetCommand(name: string): this {
    const ast = this.ast;
    const header = ast.header;

    if (!header) {
      return this;
    }

    ast.header = header.filter((cmd) => {
      if (!isHeaderCommand(cmd) || cmd.name !== 'set') {
        return true;
      }

      const arg = cmd.args[0];

      if (!isBinaryExpression(arg) || arg.name !== '=') {
        return true;
      }

      const left = arg.args[0];

      return !isIdentifier(left) || left.name !== name;
    });

    return this;
  }

  /**
   * Gets all SET instructions from the query header.
   *
   * ```typescript
   * const sets = query.getSetCommands();
   * // Returns: [{ name: 'a', value: 'foo' }, { name: 'b', value: 123 }]
   * ```
   *
   * @returns An array of objects containing the setting name and value pairs.
   */
  public getSetInstructions(): Array<[name: string, value: ESQLAstExpression]> {
    const ast = this.ast;
    const header = ast.header;
    const sets: Array<[name: string, value: ESQLAstExpression]> = [];

    if (!header) {
      return sets;
    }

    for (const cmd of header) {
      if (!isHeaderCommand(cmd) || cmd.name !== 'set') {
        continue;
      }

      // We iterate over all instructions of a single SET command, as of this
      // writing, ES|QL supports only one instruction per SET command, but
      // used to support multiple in the past, and may likely do so again in
      // the future.
      for (const arg of cmd.args) {
        if (isBinaryExpression(arg) && arg.name === '=') {
          const left = arg.args[0];
          const right = arg.args[1];

          if (isIdentifier(left) && (isProperNode(right) || Array.isArray(right))) {
            sets.push([left.name as string, resolveItem(right)]);
          }
        }
      }
    }

    return sets;
  }

  /**
   * Returns a flattened record of all SET instructions from the query header.
   * Values are converted to their native types (string, number, boolean). If
   * an instruction with the same name appears multiple times, the last one
   * takes precedence. (Elasticsearch also uses the last value.)
   *
   * @returns A POJO of flattened set instructions.
   */
  public getSetInstructionRecord(): Record<string, string | number | boolean> {
    const instructions = this.getSetInstructions();
    const record: Record<string, string | number | boolean> = {};

    for (const [name, value] of instructions) {
      if (isStringLiteral(value)) {
        record[name] = value.valueUnquoted;
      } else if (isIntegerLiteral(value) || isDoubleLiteral(value)) {
        record[name] = value.value;
      } else if (isBooleanLiteral(value)) {
        record[name] = value.value === 'TRUE';
      }
    }

    return record;
  }

  /**
   * Removes all SET instructions from the query header.
   *
   * ```typescript
   * query.clearSetCommands();
   * // Removes all: SET a = "foo"; SET b = 123;
   * ```
   *
   * @returns The updated ComposerQuery instance.
   */
  public clearSetCommands(): this {
    const ast = this.ast;
    const header = ast.header;

    if (header) {
      // We use `.filter()` here to filter out only SET commands, preserving
      // any other potential header commands in the future.
      ast.header = header.filter((cmd) => !isHeaderCommand(cmd) || cmd.name !== 'set');
    }

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
    return this.dump({ ast: false });
  }

  public dump(options: ComposerQueryDumpOptions = {}): string {
    const showAst = options.ast ?? true;

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
        showAst ? () => '' : null,
        showAst
          ? (tab) =>
              'ast' + printTree(tab, [(tab2) => printAst(this.ast, { location: false }, tab2)])
          : null,
      ])
    );
  }
}

export interface ComposerQueryDumpOptions {
  /**
   * Whether to include the AST dump in the output. Default is `true`.
   */
  ast?: boolean;
}
