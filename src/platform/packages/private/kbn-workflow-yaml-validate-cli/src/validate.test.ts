/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv';
import { validateWorkflowYaml } from './validate';
import type { SchemaValidateFn } from './create_schema_validator';

const failFn =
  (errors: ErrorObject[]): SchemaValidateFn =>
  async () => ({ errors, overflowed: false });

describe('validateWorkflowYaml', () => {
  it('does not fail the run when the only schema issue is a LiquidJS value (warning)', async () => {
    const yaml = [
      'version: "1"',
      'name: wf',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: lookup',
      '    type: console',
      '    with:',
      '      message: "{{ liquidjs.item }}"',
      '',
    ].join('\n');
    const validateSchema = failFn([
      {
        instancePath: '/steps/0/with/message',
        schemaPath: '#/properties/with/properties/message/oneOf',
        keyword: 'oneOf',
        params: { passingSchemas: [0, 1] },
        message: 'must match exactly one schema in oneOf',
      },
    ] as ErrorObject[]);

    const outcome = await validateWorkflowYaml({
      file: 'wf.yaml',
      yaml,
      validateSchema,
      variantMode: 'strict',
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.issues.some((issue) => issue.severity === 'warning')).toBe(true);
    expect(outcome.issues.some((issue) => issue.severity !== 'warning')).toBe(false);
  });

  it('fails the run for a genuine (non-template) schema error', async () => {
    const validateSchema = failFn([
      {
        instancePath: '',
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'version' },
        message: "must have required property 'version'",
      },
    ] as ErrorObject[]);

    const outcome = await validateWorkflowYaml({
      file: 'wf.yaml',
      yaml: `steps: []\n`,
      validateSchema,
      variantMode: 'strict',
    });

    expect(outcome.ok).toBe(false);
  });
});
