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

const passFn: SchemaValidateFn = async () => ({ errors: [], overflowed: false });

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

  it('fails packaged templates that reference product-owned custom steps', async () => {
    const yaml = [
      'template-metadata:',
      '  slug: packaged-workflow',
      '  version: 1.0.0',
      '  availability: ">=9.5.0"',
      '  name: Packaged workflow',
      '  description: Package asset',
      '  categories: [ops]',
      'version: "1"',
      'name: wf',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: product-step',
      '    type: security.sendResponseAction',
      '',
    ].join('\n');

    const outcome = await validateWorkflowYaml({
      file: '/tmp/sdlc_intel-1.0.0/kibana/workflow/packaged.yaml',
      yaml,
      validateSchema: passFn,
      variantMode: 'auto',
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.issues).toContainEqual(
      expect.objectContaining({ source: 'stock-step', path: 'steps.0.type' })
    );
  });

  it('does not apply the packaged stock-step contract to ordinary authored workflows', async () => {
    const yaml = [
      'version: "1"',
      'name: wf',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: product-step',
      '    type: security.sendResponseAction',
      '',
    ].join('\n');

    const outcome = await validateWorkflowYaml({
      file: '/tmp/authored.yaml',
      yaml,
      validateSchema: passFn,
      variantMode: 'strict',
    });

    expect(outcome.issues.filter((issue) => issue.source === 'stock-step')).toEqual([]);
  });

  it('does not confuse workflow-library templates with Elastic package assets', async () => {
    const yaml = [
      'template-metadata:',
      '  slug: library-template',
      '  version: 1.0.0',
      '  availability: ">=9.5.0"',
      '  name: Library template',
      '  description: Uses an approved custom connector',
      '  categories: [ops]',
      'version: "1"',
      'name: wf',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: check',
      '    type: abuseipdb.checkIp',
      '',
    ].join('\n');

    const outcome = await validateWorkflowYaml({
      file: '/tmp/workflow-library/templates/ip-check.yaml',
      yaml,
      validateSchema: passFn,
      variantMode: 'auto',
    });

    expect(outcome.issues.filter((issue) => issue.source === 'stock-step')).toEqual([]);
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

  it('does not fail the run when the only schema issue is a managed __TOKEN__ (--variant managed)', async () => {
    const yaml = [
      'version: "1"',
      'name: wf',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: detect',
      '    type: console',
      '    with:',
      '      value: __DETECTION_INTERVAL_MINUTES__',
      '',
    ].join('\n');
    const validateSchema = failFn([
      {
        instancePath: '/steps/0/with/value',
        schemaPath: '#/properties/with/properties/value/type',
        keyword: 'type',
        params: { type: 'number' },
        message: 'must be number',
      },
    ] as ErrorObject[]);

    const outcome = await validateWorkflowYaml({
      file: 'wf.yaml',
      yaml,
      validateSchema,
      variantMode: 'managed',
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.issues.some((issue) => issue.source === 'managed-placeholder')).toBe(true);
    expect(outcome.issues.some((issue) => issue.severity !== 'warning')).toBe(false);
  });
});
