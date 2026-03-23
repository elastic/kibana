/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import {
  appendToESQLQuery,
  getLimitFromESQLQuery,
  hasTransformationalCommand,
  sanitazeESQLInput,
} from '@kbn/esql-utils';

const METRICS_INFO_SUFFIX = ' | METRICS_INFO';

// TODO: This should be moved to the esql-utils package

/**
 * Appends "| METRICS_INFO" to an ES|QL query if it has no transformational commands.
 * SORT is removed from the query. LIMIT, if present, is appended after METRICS_INFO.
 * @param esql the ES|QL query.
 * @returns the query with "| METRICS_INFO" added, or an empty string if not allowed.
 */
export function buildMetricsInfoQuery(esql?: string, dimensions?: string[]): string {
  const trimmed = esql?.trim();
  if (!trimmed) {
    return '';
  }

  if (hasTransformationalCommand(trimmed)) {
    return '';
  }

  const { errors, root } = Parser.parse(trimmed);
  if (errors.length > 0) {
    return '';
  }

  const hasLimit = Walker.matchAll(root, { type: 'command', name: 'limit' }).length > 0;
  // Remove sort cause sorting for METRCS_INFO the user needs to pass only the fields from METRICS_INFO response
  const baseCommands = root.commands.filter((cmd) => cmd.name !== 'sort' && cmd.name !== 'limit');
  const baseQuery = BasicPrettyPrinter.print({ ...root, commands: baseCommands }).trim();

  // Avoid double append
  if (/metrics_info\s*$/i.test(trimmed) || trimmed.toUpperCase().endsWith('| METRICS_INFO')) {
    return trimmed;
  }

  const filteringDimensions =
    dimensions?.map((dimension) => `${sanitazeESQLInput(dimension)} IS NOT NULL`).join(' AND ') ??
    [];

  const esqlQuery = appendToESQLQuery(
    baseQuery,
    filteringDimensions?.length > 0 ? `| WHERE ${filteringDimensions}` : ''
  );

  const limitSuffix = hasLimit ? ` | LIMIT ${getLimitFromESQLQuery(trimmed)}` : '';
  return `${esqlQuery}${METRICS_INFO_SUFFIX}${limitSuffix}`;
}
