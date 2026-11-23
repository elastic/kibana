/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, isColumn, isSubQuery, LeafPrinter, synth, Walker } from '@elastic/esql';
import type { ESQLAstCommand, ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
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

  if (columnIsPresent(node, set)) {
    return true;
  }

  // ROW only sees columns the command itself defined.
  if (excludeFields) {
    return false;
  }

  return getFlattenedKeyColumn(getColumnName(node), columns) !== undefined;
}

/**
 * Returns a keyword column when the closest mapped prefix of an unmapped name is flattened.
 */
export function getFlattenedKeyColumn(
  columnName: string,
  columns: Map<string, ESQLColumnData>
): ESQLColumnData | undefined {
  if (columns.has(columnName) || columnName.includes('*') || !columnName.includes('.')) {
    return undefined;
  }

  const parts = columnName.split('.');
  if (parts.some((part) => part.length === 0)) {
    return undefined;
  }

  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('.');
    const parent = columns.get(prefix);

    if (!parent) {
      continue;
    }

    if (parent.type !== KBN_FIELD_TYPES.FLATTENED) {
      return undefined;
    }

    return {
      name: columnName,
      type: 'keyword',
      userDefined: false,
    };
  }

  return undefined;
}

/** Collects flattened keys named by a command so later commands can still see them. */
export function getFlattenedKeyFields(
  command: ESQLAstCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] {
  if (!previousColumns.some((field) => field.type === KBN_FIELD_TYPES.FLATTENED)) {
    return [];
  }

  const columns = new Map(previousColumns.map((field) => [field.name, field]));
  const flattenedKeys: ESQLColumnData[] = [];

  Walker.walk(command, {
    visitParens: (node, _parent, walker) => {
      if (isSubQuery(node)) {
        walker.skipChildren();
      }
    },
    visitColumn: (node) => {
      const name = node.parts.join('.');
      if (columns.has(name)) {
        return;
      }

      const keyColumn = getFlattenedKeyColumn(name, columns);
      if (!keyColumn) {
        return;
      }

      columns.set(name, keyColumn);
      flattenedKeys.push(keyColumn);
    },
  });

  return flattenedKeys;
}

/** Appends flattened keys named by a command, keeping the original list when there are none. */
export function columnsWithFlattenedKeys(
  command: ESQLAstCommand,
  columns: ESQLColumnData[]
): ESQLColumnData[] {
  const flattenedKeyFields = getFlattenedKeyFields(command, columns);

  if (flattenedKeyFields.length === 0) {
    return columns;
  }

  return [...columns, ...flattenedKeyFields];
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
