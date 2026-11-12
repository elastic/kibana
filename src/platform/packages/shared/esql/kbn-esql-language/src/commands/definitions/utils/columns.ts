/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, isColumn, LeafPrinter, synth } from '@elastic/esql';
import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import type { ICommandContext, ESQLColumnData } from '../../registry/types';
import { commandsMetadata } from '../generated/commands/commands';
import type { Commands } from '../keywords';
import type {
  ElasticsearchCommandDefinition,
  ElasticsearchCommandOutputDefinition,
  ElasticsearchCommandOutputVariant,
} from '../types';
import { fuzzySearch } from './shared';

export function getColumnExists(
  node: ESQLColumn | ESQLIdentifier,
  { columns }: Pick<ICommandContext, 'columns'>,
  excludeFields = false
) {
  const set = new Set(
    !excludeFields
      ? columns.keys()
      : Array.from(columns.values())
          .filter((col) => col.userDefined)
          .map((col) => col.name)
  );

  return columnIsPresent(node, set);
}

export function columnIsPresent(node: ESQLColumn | ESQLIdentifier, columns: Set<string>) {
  const columnName = getColumnName(node);
  if (columns.has(columnName)) {
    return true;
  }

  if (Boolean(fuzzySearch(columnName, columns.values()))) {
    return true;
  }

  return false;
}

export function getColumnName(node: ESQLColumn | ESQLIdentifier): string {
  return node.type === 'identifier' ? node.name : node.parts.join('.');
}

/**
 * Escapes a field name into a valid ES|QL column reference, backtick-quoting the segments
 * that need it (digits, keywords, symbols). Existing ES|QL column quoting is preserved.
 *
 * Set `asExpression` when suggesting a column whose name may be a whole expression (e.g. an
 * implicit EVAL output like `host.cpu.pct > 0.5`): those are quoted as a single identifier,
 * valid column paths still escape per segment.
 */
export const escapeEsqlColumnName = (
  columnName: string,
  { asExpression }: { asExpression?: boolean } = {}
): string => {
  if (columnName.includes('`') || asExpression) {
    try {
      const expression = synth.exp(columnName);

      // Preserve existing ES|QL quoting instead of escaping its backticks again.
      if (isColumn(expression)) {
        return LeafPrinter.column(expression);
      }
    } catch {
      // A backtick can also be part of a raw column name. Let the printer escape it below.
    }

    if (asExpression) {
      return LeafPrinter.identifier(Builder.identifier({ name: columnName }));
    }
  }

  return columnName
    .split('.')
    .map((part) => LeafPrinter.identifier(Builder.identifier({ name: part })))
    .join('.');
};

/** Reads the generated output schema for a command from the command definitions. */
export const getCommandOutput = (
  command: Commands
): ElasticsearchCommandOutputDefinition | undefined =>
  (commandsMetadata[command] as ElasticsearchCommandDefinition | undefined)?.output;

/** Reads the generated output columns for a command variant (defaults to the single `all` variant). */
export const getCommandOutputColumns = (
  command: Commands,
  variant: string = 'all'
): ElasticsearchCommandOutputVariant | undefined => getCommandOutput(command)?.variants[variant];

/** Builds columns by prefixing each generated output column with the target field name. */
export const buildPrefixedColumns = (
  prefix: string,
  columns: ElasticsearchCommandOutputVariant
): ESQLColumnData[] =>
  Object.entries(columns).map(([suffix, { type }]) => ({
    name: `${prefix}.${suffix}`,
    type,
    userDefined: false,
  }));
