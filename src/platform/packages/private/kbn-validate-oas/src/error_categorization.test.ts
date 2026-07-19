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
  countSeverities,
  computeBreakdown,
  isNewBaselineShape,
  isLegacyBaselineShape,
  hasSeverityIncrease,
  type OasIssue,
  type Baseline,
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
});

describe('computeBreakdown', () => {
  it('nests category subtotals under each severity bucket', () => {
    const issues: OasIssue[] = [
      { path: '', message: '', source: 'schema', severity: 'error', category: 'structural' },
      { path: '', message: '', source: 'schema', severity: 'warning', category: 'quality' },
      { path: '', message: '', source: 'schema', severity: 'warning', category: 'quality' },
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

  it('rejects an empty object baseline', () => {
    expect(isNewBaselineShape({})).toBe(false);
    expect(isLegacyBaselineShape({})).toBe(false);
  });

  it('rejects a malformed baseline', () => {
    const malformed = {
      './oas_docs/output/kibana.yaml': { errors: '1', warnings: 16 },
    };

    expect(isNewBaselineShape(malformed)).toBe(false);
    expect(isLegacyBaselineShape(malformed)).toBe(false);
  });
});

describe('hasSeverityIncrease', () => {
  const yamlPath = './oas_docs/output/kibana.yaml';
  const yamlPaths = [yamlPath];

  it('fails when only warnings rise', () => {
    const baseline: Baseline = { [yamlPath]: { errors: 1, warnings: 2 } };
    const current: Baseline = { [yamlPath]: { errors: 1, warnings: 3 } };

    expect(hasSeverityIncrease(baseline, current, yamlPaths)).toBe(true);
  });

  it('fails when only errors rise', () => {
    const baseline: Baseline = { [yamlPath]: { errors: 1, warnings: 2 } };
    const current: Baseline = { [yamlPath]: { errors: 2, warnings: 2 } };

    expect(hasSeverityIncrease(baseline, current, yamlPaths)).toBe(true);
  });

  it('fails on category-swap: errors up and warnings down', () => {
    const baseline: Baseline = { [yamlPath]: { errors: 1, warnings: 5 } };
    const current: Baseline = { [yamlPath]: { errors: 2, warnings: 3 } };

    expect(hasSeverityIncrease(baseline, current, yamlPaths)).toBe(true);
  });

  it('fails on category-swap: warnings up and errors down', () => {
    const baseline: Baseline = { [yamlPath]: { errors: 2, warnings: 3 } };
    const current: Baseline = { [yamlPath]: { errors: 1, warnings: 5 } };

    expect(hasSeverityIncrease(baseline, current, yamlPaths)).toBe(true);
  });

  it('passes when neither axis increases', () => {
    const baseline: Baseline = { [yamlPath]: { errors: 2, warnings: 5 } };
    const current: Baseline = { [yamlPath]: { errors: 1, warnings: 5 } };

    expect(hasSeverityIncrease(baseline, current, yamlPaths)).toBe(false);
  });
});
