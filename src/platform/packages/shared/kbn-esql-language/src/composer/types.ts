/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as synth from './synth';
import type { ESQLAstCommand, ESQLCommand, ESQLOrderExpression, ESQLSource } from '../types';
import type { ComposerQuery } from './composer_query';
import type { ParameterHole, DoubleParameterHole } from './parameter_hole';

/**
 * Holes are expressions that can be used in the `esql` tagged template function.
 *
 * ```ts
 * esql `FROM index | WHERE foo > ${ hole } | LIMIT 10`;
 *                                  ^~~~~^
 * ```
 */
export type ComposerQueryTagHole =
  /**
   * All Synth API holes are supported.
   */
  | synth.SynthTemplateHole

  /**
   * An ESQL command node can be used as a hole, for example to
   * conditionally add a command to the query.
   */
  | ESQLAstCommand

  /**
   * A parameter hole is where user provides a runtime value and we automatically
   * create a parameter for that hole in the AST and store the parameter value
   * in the `params` bag.
   */
  | ParameterHole

  /**
   * Same as {@link ParameterHole}, but a shorthand syntax.
   */
  | ParameterShorthandHole

  /**
   * A nested ComposerQuery instance can be used as a hole to embed
   * one query into another. For example, to build a `FORK` command
   * out of multiple sub-queries.
   */
  | ComposerQuery;

/**
 * A hole shorthand where the user can specify a parametrized hole with an
 * object literal syntax where th
 */
export type ParameterShorthandHole = Record<string, unknown>;

/**
 * {@link SingleKey} enforces on the type level that an object literal has just
 * one field.
 */
export type SingleKey<T> = IsUnion<keyof T> extends true ? never : {} extends T ? never : T;
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type ComposerTag<Return> = <T extends ComposerQueryTagHole[]>(
  template: TemplateStringsArray,
  /**
   * The SingleKey below ensures that the parameter shorthand holes
   * are processed correctly, allowing only one key per object.
   */
  ...holes: { [K in keyof T]: T[K] extends ParameterShorthandHole ? SingleKey<T[K]> : T[K] }
) => Return;

export type ParametrizedComposerTag<Return> = (
  paramsValues?: Record<string, unknown>
) => ComposerTag<Return> & ComposerQueryGenerator<Return>;
export type ComposerQueryTag = ComposerTag<ComposerQuery>;
export type ParametrizedComposerQueryTag = ParametrizedComposerTag<ComposerQuery>;
export type ComposerQueryGenerator<Return = ComposerQuery> = (
  query: string,
  paramsValues?: Record<string, unknown>
) => Return;

type SynthMethods = typeof import('./synth');

/**
 * Methods available of the `esql` tagged template function.
 * These methods are used to construct AST nodes.
 */
export interface ComposerQueryTagMethods extends Omit<SynthMethods, 'par' | 'dpar'> {
  par: (value: unknown, name?: string) => ParameterHole;
  dpar: (value: unknown, name?: string) => DoubleParameterHole;

  /**
   * Creates a new {@linkcode ComposerQuery} instance with a `FROM` command with
   * the specified list of sources.
   *
   * Example:
   *
   * ```typescript
   * const query = esql.from('kibana_ecommerce_index', 'kibana_logs_index');
   * // FROM kibana_ecommerce_index, kibana_logs_index
   * ```
   *
   * or with metadata fields:
   *
   * ```typescript
   * const query = esql.from(
   *   ['kibana_ecommerce_index', 'kibana_logs_index'],
   *   ['_id', '_index']
   * );
   * // FROM kibana_ecommerce_index, kibana_logs_index WITH METADATA _id, _index
   * ```
   *
   * @param source The source to use in the `FROM` command, at least one source
   *     is required.
   * @param moreSources Additional sources to include in the `FROM` command.
   */
  from: FromSourcesQueryStarter & FromSourcesAndMetadataQueryStarter;

  /**
   * Creates a new {@linkcode ComposerQuery} instance with a `TS` command with
   * the specified list of sources.
   *
   * Example:
   *
   * ```typescript
   * const query = esql.ts('kibana_ecommerce_index', 'kibana_logs_index');
   * // TS kibana_ecommerce_index, kibana_logs_index
   * ```
   *
   * or with metadata fields:
   *
   * ```typescript
   * const query = esql.from(
   *   ['kibana_ecommerce_index', 'kibana_logs_index'],
   *   ['_id', '_index']
   * );
   * // FROM kibana_ecommerce_index, kibana_logs_index WITH METADATA _id, _index
   * ```
   *
   * @param source The source to use in the `TS` command, at least one source
   *     is required.
   * @param moreSources Additional sources to include in the `TS` command.
   */
  ts: FromSourcesQueryStarter & FromSourcesAndMetadataQueryStarter;

  /**
   * An AST no-op command that can be used in the query, for example in
   * conditional expressions.
   *
   * Example:
   *
   * ```typescript
   * const shouldAddNoop = true;
   * const query = esql`FROM index
   *   | ${shouldAddNoop ? esql.noop : esql.cmd`WHERE foo > 42`}
   *   | LIMIT 10`;
   * ```
   *
   * No-op command is removed from the final query during synthesis.
   *
   * @returns An ESQLCommand node representing a no-op command.
   */
  nop: ESQLCommand;
}

export type FromSourcesQueryStarter = (
  source: ComposerSourceShorthand,
  ...moreSources: ComposerSourceShorthand[]
) => ComposerQuery;

export type FromSourcesAndMetadataQueryStarter = (
  sources: ComposerSourceShorthand[],
  metadataFields?: ComposerColumnShorthand[]
) => ComposerQuery;

/**
 * A shorthand for specifying a source with an optional alias.
 *
 * ```
 * { index: 'my_index', alias: 'i' }
 * // Result: my_index AS i
 * ```
 */
export interface ComposerSourceWithAlias {
  index: string;
  alias: string;
}

export type ComposerSourceShorthand = string | ESQLSource | ComposerSourceWithAlias;

/**
 * A shorthand for specifying a column in the query.
 * It can be a string a simple column or an array of strings for a nested column.
 */
export type ComposerColumnShorthand =
  | string
  | synth.SynthColumnShorthand
  | synth.SynthQualifiedColumnShorthand;

/**
 * A shorthand for specifying a rename expression in the `RENAME` command.
 *
 * ```
 * ... | RENAME <oldName> AS <newName> | ...
 * ```
 */
export type ComposerRenameShorthand = [
  newName: ComposerColumnShorthand,
  oldName: ComposerColumnShorthand
];

/**
 * A shorthand for specifying a sort condition.
 */
export type ComposerSortShorthand =
  /**
   * A single column name, which is not nested, e.g. `@timestamp`.
   * This is equivalent to `['@timestamp']`.
   */
  | string
  /**
   * A column with ASC/DESC order and NULLS FIRST/LAST qualifiers.
   */
  | [
      /**
       * The column name, which can be either a string, for a non-nested column,
       * or an array of strings for a nested column. For example,
       * `['user', 'name']` is equivalent to `user.name`.
       */
      column: ComposerColumnShorthand,
      order?: ESQLOrderExpression['order'],
      nulls?: ESQLOrderExpression['nulls']
    ];

/**
 * The Elasticsearch request body as it can be sent to the `POST /_query` endpoint.
 */
export interface EsqlRequest {
  query: string;
  params?: EsqlRequestParams;
  filter?: unknown;
  columnar?: boolean;
  locale?: string;
  wait_for_completion_timeout?: string;
}
export type EsqlRequestParams = EsqlRequestParamEntry[];
export type EsqlRequestParamEntry = EsqlRequestParamPositionalEntry | EsqlRequestParamNamedEntry;
export type EsqlRequestParamPositionalEntry = string | number | boolean | null;
export type EsqlRequestParamNamedEntry = Record<string, unknown>;

export interface QueryCommandTag extends QueryCommandTagParametrized {
  (initialParams: Record<string, unknown>): QueryCommandTagParametrized;
}

export interface QueryCommandTagParametrized {
  (template: TemplateStringsArray, ...holes: ComposerQueryTagHole[]): ComposerQuery;
  (query: string, paramsValues?: Record<string, unknown>): ComposerQuery;
}
