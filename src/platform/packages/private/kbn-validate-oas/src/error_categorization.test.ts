/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv-draft-04';
import {
  classifySchemaError,
  classifyRefError,
  classifyCompatibilityIssue,
  countSeverities,
  computeBreakdown,
  isNewBaselineShape,
  isLegacyBaselineShape,
  type OasIssue,
} from './error_categorization';

const schemaError = (overrides: Partial<ErrorObject> = {}): ErrorObject => ({
  keyword: 'additionalProperties',
  instancePath: '/paths/~1api~1test/get',
  schemaPath: '#/additionalProperties',
  params: {},
  message: 'must NOT have additional properties',
  ...overrides,
});

describe('classifySchemaError', () => {
  it.each(['description', 'summary', 'example', 'examples'])(
    'classifies required doc property "%s" as quality/warning',
    (missingProperty) => {
      const issue = classifySchemaError(
        schemaError({
          keyword: 'required',
          params: { missingProperty },
          message: `must have required property '${missingProperty}'`,
        })
      );

      expect(issue).toMatchObject({
        source: 'schema',
        severity: 'warning',
        category: 'quality',
      });
    }
  );

  it.each([
    schemaError({ keyword: 'additionalProperties' }),
    schemaError({ keyword: 'type', params: { type: 'string' } }),
    schemaError({ keyword: 'minProperties', params: { limit: 1 } }),
    schemaError({ keyword: 'required', params: { missingProperty: 'name' } }),
  ])('classifies non-doc schema error as structural/error', (error) => {
    const issue = classifySchemaError(error);

    expect(issue).toMatchObject({
      source: 'schema',
      severity: 'error',
      category: 'structural',
    });
  });

  it('preserves path and schemaPath from the AJV error', () => {
    const issue = classifySchemaError(schemaError());

    expect(issue?.path).toBe('/paths/~1api~1test/get');
    expect(issue?.schemaPath).toBe('#/additionalProperties');
  });

  it('drops missingProperty "$ref" noise', () => {
    expect(
      classifySchemaError(schemaError({ keyword: 'required', params: { missingProperty: '$ref' } }))
    ).toBeNull();
  });

  it('drops passingSchemas null noise', () => {
    expect(
      classifySchemaError(schemaError({ keyword: 'oneOf', params: { passingSchemas: null } }))
    ).toBeNull();
  });
});

describe('classifyRefError', () => {
  it('classifies an unresolved ref as structural/error from ref-resolution', () => {
    const issue = classifyRefError("Can't resolve #/components/schemas/Missing");

    expect(issue).toEqual({
      path: '',
      message: "Can't resolve #/components/schemas/Missing",
      source: 'ref-resolution',
      severity: 'error',
      category: 'structural',
    });
  });
});

describe('classifyCompatibilityIssue', () => {
  it('classifies a compatibility issue as structural/error from compatibility', () => {
    const issue = classifyCompatibilityIssue({
      path: '/paths/~1api~1test/get',
      message: 'incompatible',
      ruleId: 'some-rule',
    });

    expect(issue).toMatchObject({
      source: 'compatibility',
      severity: 'error',
      category: 'structural',
      ruleId: 'some-rule',
    });
  });
});

describe('countSeverities', () => {
  it('counts errors and warnings from schema and ref sources', () => {
    const issues: OasIssue[] = [
      { path: '', message: '', source: 'schema', severity: 'error', category: 'structural' },
      {
        path: '',
        message: '',
        source: 'ref-resolution',
        severity: 'error',
        category: 'structural',
      },
      { path: '', message: '', source: 'schema', severity: 'warning', category: 'quality' },
    ];

    expect(countSeverities(issues)).toEqual({ errors: 2, warnings: 1 });
  });

  it('excludes compatibility-sourced issues', () => {
    const issues: OasIssue[] = [
      { path: '', message: '', source: 'schema', severity: 'error', category: 'structural' },
      { path: '', message: '', source: 'compatibility', severity: 'error', category: 'structural' },
    ];

    expect(countSeverities(issues)).toEqual({ errors: 1, warnings: 0 });
  });
});

describe('computeBreakdown', () => {
  it('nests category subtotals under each severity bucket, excluding compatibility', () => {
    const issues: OasIssue[] = [
      { path: '', message: '', source: 'schema', severity: 'error', category: 'structural' },
      { path: '', message: '', source: 'schema', severity: 'warning', category: 'quality' },
      { path: '', message: '', source: 'schema', severity: 'warning', category: 'quality' },
      { path: '', message: '', source: 'compatibility', severity: 'error', category: 'structural' },
    ];

    expect(computeBreakdown(issues)).toEqual({
      errors: { structural: 1, quality: 0 },
      warnings: { structural: 0, quality: 2 },
    });
  });
});

describe('baseline shape guards', () => {
  it('accepts the new {errors, warnings} shape', () => {
    const baseline = {
      './oas_docs/output/kibana.yaml': { errors: 1, warnings: 16 },
    };

    expect(isNewBaselineShape(baseline)).toBe(true);
    expect(isLegacyBaselineShape(baseline)).toBe(false);
  });

  it('detects the legacy { path: number } shape', () => {
    const baseline = {
      './oas_docs/output/kibana.yaml': 16,
    };

    expect(isLegacyBaselineShape(baseline)).toBe(true);
    expect(isNewBaselineShape(baseline)).toBe(false);
  });
});
