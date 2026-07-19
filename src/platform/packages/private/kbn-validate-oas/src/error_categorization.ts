/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv-draft-04';
import type { CompatibilityIssue } from './compatibility';

export type IssueSource = 'schema' | 'compatibility' | 'ref-resolution';
export type IssueSeverity = 'error' | 'warning';
export type IssueCategory = 'structural' | 'quality';

export interface OasIssue {
  path: string;
  message: string;
  schemaPath?: string;
  source: IssueSource;
  severity: IssueSeverity;
  category: IssueCategory;
  // Declared for a future autofix pass; unused in policy v1.
  ruleId?: string;
  suggestedFix?: string;
  autofixable?: boolean;
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

/**
 * Classifies a single AJV schema error into an OasIssue, or returns `null` when
 * the error is known noise that should be dropped:
 * - `missingProperty: '$ref'`: `$ref` is an optional optimization, never required.
 * - `passingSchemas: null`: aggregate `anyOf`/`oneOf` noise.
 */
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

export const classifyCompatibilityIssue = (issue: CompatibilityIssue): OasIssue => ({
  path: issue.path,
  message: issue.message,
  source: 'compatibility',
  severity: 'error',
  category: 'structural',
  ruleId: issue.ruleId,
});

/**
 * Severity counts for the baseline. Compatibility issues are excluded because
 * they keep their independent hard-fail path (see cli.ts).
 */
export const countSeverities = (issues: OasIssue[]): SeverityCounts =>
  issues.reduce<SeverityCounts>(
    (counts, issue) => {
      if (issue.source === 'compatibility') {
        return counts;
      }
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
      if (issue.source === 'compatibility') {
        return breakdown;
      }
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
  Object.values(value).every((entry) => isSeverityCounts(entry));

export const isLegacyBaselineShape = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).length > 0 &&
  Object.values(value).every((entry) => typeof entry === 'number');
