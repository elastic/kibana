/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

const escapeKqlValue = (value: string): string => {
  if (/[\s:()*"\\]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
};

const filterToKqlClause = (filter: Filter): string | undefined => {
  if (filter.meta.disabled) return undefined;
  const { type, key, value, params, negate } = filter.meta;
  if (!key) return undefined;

  const prefix = negate ? 'NOT ' : '';

  switch (type) {
    case 'phrase': {
      const v = value ?? '';
      return `${prefix}${key}: ${escapeKqlValue(String(v))}`;
    }
    case 'phrases': {
      const values = params as string[] | undefined;
      if (!values?.length) return undefined;
      const joined = values.map((v) => escapeKqlValue(String(v))).join(' or ');
      return `${prefix}${key}: (${joined})`;
    }
    case 'exists':
      return `${prefix}${key}: *`;
    default:
      return undefined;
  }
};

export const filtersToKql = (filters: Filter[]): string => {
  const clauses = filters
    .map(filterToKqlClause)
    .filter((clause): clause is string => clause != null);
  return clauses.length ? clauses.map((c) => `(${c})`).join(' and ') : '';
};

export const timeRangeToKql = (
  timeFrom: string,
  timeTo: string,
  timeField: string = 'startedAt'
): string => `(${timeField} >= "${timeFrom}" and ${timeField} <= "${timeTo}")`;

interface WorkflowExecutionsSearchError {
  attributes?: { error?: { type?: string } };
  body?: { error?: { type?: string } };
}

const getElasticsearchErrorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return;
  }
  const { attributes, body } = error as WorkflowExecutionsSearchError;
  return attributes?.error?.type ?? body?.error?.type;
};

export const isWorkflowExecutionsIndexNotFoundError = (error: unknown): boolean =>
  getElasticsearchErrorType(error) === 'index_not_found_exception';

export const getWorkflowExecutionsFetchErrorMessage = (): string =>
  i18n.translate('workflowsManagement.executionsPage.fetchError', {
    defaultMessage: 'Failed to load executions',
  });
