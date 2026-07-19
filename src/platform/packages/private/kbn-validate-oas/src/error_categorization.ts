/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv-draft-04';

export type IssueSource = 'schema' | 'ref-resolution';
export type IssueSeverity = 'error' | 'warning';
export type IssueCategory = 'structural' | 'quality';

export interface OasIssue {
  path: string;
  message: string;
  schemaPath?: string;
  source: IssueSource;
  severity: IssueSeverity;
  category: IssueCategory;
}

export interface SeverityCounts {
  errors: number;
  warnings: number;
}

export interface CategoryBreakdown {
  errors: { structural: number; quality: number };
  warnings: { structural: number; quality: number };
}

export type Baseline = Record<string, SeverityCounts>;

const DOC_COMPLETENESS_PROPERTIES = new Set(['description', 'summary', 'example', 'examples']);

// Drop known AJV noise: optional `$ref`, aggregate anyOf/oneOf `passingSchemas: null`.
export const classifySchemaError = (error: ErrorObject): OasIssue | null => {
  const { params, keyword, instancePath, message, schemaPath } = error;

  if (params.missingProperty === '$ref') {
    return null;
  }

  if (params.passingSchemas === null) {
    return null;
  }

  const isDocCompleteness =
    keyword === 'required' && DOC_COMPLETENESS_PROPERTIES.has(params.missingProperty);

  return {
    path: instancePath,
    message: message ?? '',
    schemaPath,
    source: 'schema',
    severity: isDocCompleteness ? 'warning' : 'error',
    category: isDocCompleteness ? 'quality' : 'structural',
  };
};

export const classifyRefError = (message: string): OasIssue => ({
  path: '',
  message,
  source: 'ref-resolution',
  severity: 'error',
  category: 'structural',
});

export const countSeverities = (issues: OasIssue[]): SeverityCounts =>
  issues.reduce<SeverityCounts>(
    (counts, issue) => {
      if (issue.severity === 'error') {
        counts.errors++;
      } else {
        counts.warnings++;
      }
      return counts;
    },
    { errors: 0, warnings: 0 }
  );

export const computeBreakdown = (issues: OasIssue[]): CategoryBreakdown =>
  issues.reduce<CategoryBreakdown>(
    (breakdown, issue) => {
      breakdown[issue.severity === 'error' ? 'errors' : 'warnings'][issue.category]++;
      return breakdown;
    },
    {
      errors: { structural: 0, quality: 0 },
      warnings: { structural: 0, quality: 0 },
    }
  );

const isSeverityCounts = (value: unknown): value is SeverityCounts =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SeverityCounts).errors === 'number' &&
  typeof (value as SeverityCounts).warnings === 'number';

export const isNewBaselineShape = (value: unknown): value is Baseline =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).length > 0 &&
  Object.values(value).every((entry) => isSeverityCounts(entry));

export const isLegacyBaselineShape = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).length > 0 &&
  Object.values(value).every((entry) => typeof entry === 'number');

// Gates on both axes: a warning increase is also a failure. Without this, a quality-warning
// increase (missing descriptions) could hide behind a structural cleanup that lowers the error
// count, leaving the total unchanged and CI green despite a real regression.
export const hasSeverityIncrease = (
  baseline: Baseline,
  current: Baseline,
  yamlPaths: string[]
): boolean =>
  yamlPaths.some((yamlPath) => {
    const prev = baseline[yamlPath] ?? { errors: 0, warnings: 0 };
    const curr = current[yamlPath] ?? { errors: 0, warnings: 0 };
    return curr.errors > prev.errors || curr.warnings > prev.warnings;
  });
