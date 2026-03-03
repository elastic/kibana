/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@kbn/esql-language';
import { hasTransformationalCommand } from '@kbn/esql-utils';

const METRICS_INFO_SUFFIX = ' | METRICS_INFO';

// TODO: This should be moved to the esql-utils package

/**
 * Appends "| METRICS_INFO" to an ES|QL query if it has no transformational commands.
 * @param esql the ES|QL query.
 * @returns the query with "| METRICS_INFO" added, or an empty string if not allowed.
 */
export function buildMetricsInfoQuery(esql?: string): string {
  const trimmed = esql?.trim();
  if (!trimmed) {
    return '';
  }

  if (hasTransformationalCommand(trimmed)) {
    return '';
  }

  const { errors } = Parser.parse(trimmed);
  if (errors.length > 0) {
    return '';
  }

  // Avoid double append
  if (/metrics_info\s*$/i.test(trimmed) || trimmed.toUpperCase().endsWith('| METRICS_INFO')) {
    return trimmed;
  }

  return `${trimmed}${METRICS_INFO_SUFFIX}`;
}
