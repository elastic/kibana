/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import { hasTransformationalCommand, getLimitFromESQLQuery } from '../query_parsing_helpers';
import { getSourceCommandFromESQLQuery } from '../get_index_pattern_from_query';
import { appendToESQLQuery } from './utils';

const METRICS_INFO_SUFFIX = ' | METRICS_INFO';

/**
 * Appends `| METRICS_INFO` to a TS ES|QL query when it has no transformational commands.
 * SORT is removed; LIMIT, if present, is re-appended at the end.
 * `postFilter`, if provided, is appended as a `WHERE` after METRICS_INFO (before LIMIT).
 */
export function buildMetricsInfoQuery(esql?: string, postFilter?: string): string {
  const trimmed = esql?.trim();
  if (!trimmed) {
    return '';
  }

  if (getSourceCommandFromESQLQuery(trimmed) !== 'TS') {
    return '';
  }

  if (hasTransformationalCommand(trimmed)) {
    return '';
  }

  const { errors, root } = Parser.parse(trimmed);
  if (errors.length > 0) {
    return '';
  }

  const hasMetricsInfo =
    Walker.matchAll(root, { type: 'command', name: 'metrics_info' }).length > 0;
  if (hasMetricsInfo) {
    return trimmed;
  }

  const hasLimit = Walker.matchAll(root, { type: 'command', name: 'limit' }).length > 0;
  const baseCommands = root.commands.filter((cmd) => cmd.name !== 'sort' && cmd.name !== 'limit');
  const baseQuery = BasicPrettyPrinter.print({ ...root, commands: baseCommands }).trim();
  const esqlQuery = appendToESQLQuery(baseQuery, '');

  const postFilterSuffix = postFilter ? ` | WHERE ${postFilter}` : '';
  const limitSuffix = hasLimit ? ` | LIMIT ${getLimitFromESQLQuery(trimmed)}` : '';
  return `${esqlQuery}${METRICS_INFO_SUFFIX}${postFilterSuffix}${limitSuffix}`;
}
