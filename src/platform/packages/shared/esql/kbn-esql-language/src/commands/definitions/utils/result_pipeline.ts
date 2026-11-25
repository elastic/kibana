/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSource, isSubQuery } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstForkCommand, ESQLSource } from '@elastic/esql/types';
import {
  findNamedSubqueryForSource,
  getNamedSubqueriesAvailableTo,
  type NamedSubquery,
} from './named_subqueries';

export type EsqlResultRowKind =
  | 'document'
  | 'schema'
  | 'aggregate'
  | 'schema-aggregate'
  | 'unknown';
export type EsqlResultRows = ReadonlySet<EsqlResultRowKind>;

const UNKNOWN_ROWS: EsqlResultRows = new Set(['unknown']);
const DOCUMENT_ROWS: EsqlResultRows = new Set(['document']);
const SCHEMA_ROWS: EsqlResultRows = new Set(['schema']);
const AGGREGATE_ROWS: EsqlResultRows = new Set(['aggregate']);

const isSchemaDerivedRow = (kind: EsqlResultRowKind): boolean =>
  kind === 'schema' || kind === 'schema-aggregate';

/** Checks whether any possible output row is schema-derived. */
export const hasSchemaDerivedRows = (rows: EsqlResultRows): boolean =>
  [...rows].some(isSchemaDerivedRow);

/** Checks whether schema-derived rows contribute to a table-only result. */
export const isSchemaTableResult = (rows: EsqlResultRows): boolean =>
  hasSchemaDerivedRows(rows) && !rows.has('document') && !rows.has('unknown');

function unionRows(results: readonly EsqlResultRows[]): EsqlResultRows {
  return results.length ? new Set(results.flatMap((rows) => [...rows])) : UNKNOWN_ROWS;
}

/** Identifies the row kinds emitted by a pipeline, following its result-producing sources. */
export function analyzeResultRows(
  commands: readonly ESQLAstCommand[],
  namedSubqueries: readonly NamedSubquery[] = []
): EsqlResultRows {
  const bindingResults = new Map<NamedSubquery, EsqlResultRows>();

  function getSourceRows(source: ESQLSource, bindings: readonly NamedSubquery[]): EsqlResultRows {
    const binding = findNamedSubqueryForSource(source, bindings);
    if (!binding) {
      return DOCUMENT_ROWS;
    }

    const cached = bindingResults.get(binding);
    if (cached) {
      return cached;
    }

    const rows = analyze(binding.query.commands, getNamedSubqueriesAvailableTo(bindings, binding));
    bindingResults.set(binding, rows);
    return rows;
  }

  function analyze(
    pipeline: readonly ESQLAstCommand[],
    bindings: readonly NamedSubquery[],
    input = UNKNOWN_ROWS
  ): EsqlResultRows {
    return pipeline.reduce<EsqlResultRows>((rows, command) => {
      switch (command.name) {
        case 'from':
          return unionRows(
            command.args.flatMap((arg) => {
              if (isSubQuery(arg)) {
                return [analyze(arg.child.commands, bindings)];
              }
              return isSource(arg) ? [getSourceRows(arg, bindings)] : [];
            })
          );
        case 'fork': {
          const { args } = command as ESQLAstForkCommand;
          return args.length
            ? unionRows(
                args.map(({ child }) =>
                  child.type === 'query' ? analyze(child.commands, bindings, rows) : rows
                )
              )
            : rows;
        }
        case 'describe':
          return SCHEMA_ROWS;
        case 'stats':
          return new Set(
            Array.from(rows, (kind) =>
              isSchemaDerivedRow(kind) ? 'schema-aggregate' : 'aggregate'
            )
          );
        case 'promql':
          return AGGREGATE_ROWS;
        default:
          return rows;
      }
    }, input);
  }

  return analyze(commands, namedSubqueries);
}
