/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
