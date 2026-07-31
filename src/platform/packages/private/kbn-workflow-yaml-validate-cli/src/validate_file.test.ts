/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv';
import { validateFile } from './validate_file';
import type { SchemaValidateFn } from './create_schema_validator';
import type { ValidationIssue } from './types';

// `validateFile` takes an injected `SchemaValidateFn` (the CLI backs it with a
// worker thread running ajv). Here we stub that boundary with `ErrorObject[]`s
// captured verbatim from a live ajv (discriminator + template-tolerant `anyOf`
// wrappers) and assert the de-noising/anchoring logic. Real compilation +
// deep-nesting behavior are covered by the generator test and the live run.
const passFn: SchemaValidateFn = async () => ({ errors: [], overflowed: false });

const failFn =
  (errors: ErrorObject[]): SchemaValidateFn =>
  async () => ({ errors, overflowed: false });

const overflowFn: SchemaValidateFn = async () => ({ errors: [], overflowed: true });

const schemaIssuesOf = (result: { issues: Array<{ source: string }> }) =>
  result.issues.filter((issue) => issue.source === 'schema');

/** The tolerant `steps` `anyOf` wrapper noise that fires alongside any deeper step error. */
const STEPS_WRAPPER_NOISE: ErrorObject[] = [
  {
    instancePath: '/steps',
    schemaPath: '#/type',
    keyword: 'type',
    params: { type: 'string' },
    message: 'must be string',
  },
  {
    instancePath: '/steps',
    schemaPath: '#/properties/steps/anyOf',
    keyword: 'anyOf',
    params: {},
    message: 'must match a schema in anyOf',
  },
] as ErrorObject[];

const VALID_METADATA = `template-metadata:
  slug: my-template
  version: 1.0.0
  availability: ">=9.5.0"
  name: My Template
  description: Does useful things
  categories:
    - ops
`;

describe('validateFile', () => {
  it('passes a valid plain workflow against the strict variant (auto)', async () => {
    const result = await validateFile({
      yaml: `version: "1"\nsteps: []\n`,
      validateSchema: passFn,
      variantMode: 'auto',
    });
    expect(result.issues).toEqual([]);
    expect(result.schemaPassed).toBe(true);
    expect(result.isTemplate).toBe(false);
    expect(result.variant).toBe('strict');
  });

  it('reports schema issues for an invalid plain workflow', async () => {
    const validateSchema = failFn([
      {
        instancePath: '',
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'version' },
        message: "must have required property 'version'",
      },
    ] as ErrorObject[]);
    const result = await validateFile({ yaml: `steps: []\n`, validateSchema, variantMode: 'auto' });
    expect(result.schemaPassed).toBe(false);
    expect(schemaIssuesOf(result)).toEqual([
      { source: 'schema', path: '<root>', message: "must have required property 'version'" },
    ]);
  });

  it('validates and strips template-metadata for a template (auto -> template variant)', async () => {
    const yaml = `${VALID_METADATA}version: "1"\nsteps: []\n`;
    const result = await validateFile({ yaml, validateSchema: passFn, variantMode: 'auto' });
    expect(result.isTemplate).toBe(true);
    expect(result.variant).toBe('template');
    expect(result.issues).toEqual([]);
    expect(result.body).not.toHaveProperty('template-metadata');
  });

  it('reports metadata issues for a template with an invalid metadata block', async () => {
    const yaml = `template-metadata:\n  slug: Invalid_Slug\nversion: "1"\n`;
    const result = await validateFile({ yaml, validateSchema: passFn, variantMode: 'auto' });
    expect(result.isTemplate).toBe(true);
    expect(result.issues.some((issue) => issue.source === 'metadata')).toBe(true);
  });

  it('honors a forced --variant while still stripping template metadata', async () => {
    const yaml = `${VALID_METADATA}version: "1"\nsteps: []\n`;
    const result = await validateFile({ yaml, validateSchema: passFn, variantMode: 'strict' });
    expect(result.isTemplate).toBe(true);
    expect(result.variant).toBe('strict');
    expect(result.issues).toEqual([]);
  });

  it('reports a yaml-syntax issue for malformed YAML', async () => {
    const result = await validateFile({
      yaml: `version: "1"\n  bad: : :\n`,
      validateSchema: passFn,
      variantMode: 'auto',
    });
    expect(result.schemaPassed).toBe(false);
    expect(result.issues.some((issue) => issue.source === 'yaml-syntax')).toBe(true);
  });

  it('reports a deep-nesting issue when validation overflows the stack', async () => {
    const result = await validateFile({
      yaml: `version: "1"\nsteps: []\n`,
      validateSchema: overflowFn,
      variantMode: 'strict',
    });
    expect(result.schemaPassed).toBe(false);
    expect(schemaIssuesOf(result)).toEqual([
      {
        source: 'schema',
        path: '<root>',
        message: 'Schema validation could not complete (document too deeply nested for the schema)',
      },
    ]);
  });

  describe('discriminator-anchored schema errors', () => {
    it('anchors an additional-property error to the step and names the offending key', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0',
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'connector-id' },
          message: 'must NOT have additional properties',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
    });

    it('flags an unknown step type without dumping the whole step union', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0',
          schemaPath: '#/discriminator',
          keyword: 'discriminator',
          params: { error: 'mapping', tag: 'type', tagValue: 'totally.unknown' },
          message: 'value of tag "type" must be in oneOf',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        { source: 'schema', path: 'steps.0.type', message: 'unknown step type "totally.unknown"' },
      ]);
    });

    it('prunes template-value branch noise from a property (with:) error', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0/with',
          schemaPath: '#/properties/with/anyOf/0/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'timeout' },
          message: 'must NOT have additional properties',
        },
        {
          instancePath: '/steps/0/with',
          schemaPath: '#/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        },
        {
          instancePath: '/steps/0/with',
          schemaPath: '#/properties/with/anyOf',
          keyword: 'anyOf',
          params: {},
          message: 'must match a schema in anyOf',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0.with',
          message: "must NOT have additional property 'timeout'",
        },
      ]);
    });

    it('anchors an error inside a nested step and prunes ancestor wrapper noise', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0/steps/0',
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'connector-id' },
          message: 'must NOT have additional properties',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0.steps.0',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
    });

    it('keeps root-level errors while anchoring step errors', async () => {
      const validateSchema = failFn([
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'version' },
          message: "must have required property 'version'",
        },
        {
          instancePath: '/steps/0',
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'connector-id' },
          message: 'must NOT have additional properties',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `steps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        { source: 'schema', path: '<root>', message: "must have required property 'version'" },
        {
          source: 'schema',
          path: 'steps.0',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
    });
  });

  describe('liquidjs-expression warnings', () => {
    /** A single-step workflow whose `with.url` holds `value`. */
    const withUrl = (value: string): string =>
      [
        'version: "1"',
        'steps:',
        '  - name: lookup',
        '    type: virustotal.scanUrl',
        '    with:',
        `      url: ${JSON.stringify(value)}`,
        '',
      ].join('\n');

    const oneOfErrorAt = (instancePath: string): ErrorObject =>
      ({
        instancePath,
        schemaPath: '#/properties/with/properties/url/oneOf',
        keyword: 'oneOf',
        params: { passingSchemas: [0, 1] },
        message: 'must match exactly one schema in oneOf',
      } as ErrorObject);

    const warningsOf = (result: { issues: ValidationIssue[] }) =>
      result.issues.filter((issue) => issue.severity === 'warning');

    it('downgrades a oneOf failure at a whole-value {{ }} to a non-failing warning', async () => {
      const result = await validateFile({
        yaml: withUrl('{{ liquidjs.item }}'),
        validateSchema: failFn([oneOfErrorAt('/steps/0/with/url')]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(true);
      expect(schemaIssuesOf(result)).toEqual([]);
      expect(warningsOf(result)).toEqual([
        {
          source: 'liquidjs-expression',
          severity: 'warning',
          message: 'strict validation skipped (liquidjs expression)',
          path: 'steps.0.with.url',
        },
      ]);
    });

    it.each([
      ['dynamic ${{ }}', '${{ steps.a.output }}'],
      ['liquid tag {% %}', '{% if x %}'],
    ])('downgrades a %s whole value', async (_label, value) => {
      const result = await validateFile({
        yaml: withUrl(value),
        validateSchema: failFn([oneOfErrorAt('/steps/0/with/url')]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(true);
      expect(warningsOf(result)).toHaveLength(1);
      expect(schemaIssuesOf(result)).toEqual([]);
    });

    it('keeps an EMBEDDED {{ }} inside a longer string as a failing error (runtime parity)', async () => {
      const result = await validateFile({
        yaml: withUrl('https://{{ inputs.host }}/x'),
        validateSchema: failFn([oneOfErrorAt('/steps/0/with/url')]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(false);
      expect(warningsOf(result)).toEqual([]);
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0.with.url',
          message: 'must match exactly one schema in oneOf',
        },
      ]);
    });

    it('prunes tolerant wrapper noise at ancestors of a templated value', async () => {
      const result = await validateFile({
        yaml: withUrl('{{ liquidjs.item }}'),
        validateSchema: failFn([
          oneOfErrorAt('/steps/0/with/url'),
          {
            instancePath: '/steps/0/with',
            schemaPath: '#/type',
            keyword: 'type',
            params: { type: 'string' },
            message: 'must be string',
          },
          {
            instancePath: '/steps/0/with',
            schemaPath: '#/properties/with/anyOf',
            keyword: 'anyOf',
            params: {},
            message: 'must match a schema in anyOf',
          },
          ...STEPS_WRAPPER_NOISE,
        ] as ErrorObject[]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(true);
      expect(schemaIssuesOf(result)).toEqual([]);
      expect(warningsOf(result)).toHaveLength(1);
    });

    it('keeps a real error at a non-templated sibling while warning on the templated value', async () => {
      const yaml = [
        'version: "1"',
        'steps:',
        '  - name: lookup',
        '    type: virustotal.scanUrl',
        '    with:',
        '      url: "{{ liquidjs.item }}"',
        '  - name: other',
        '    type: console',
        '    connector-id: nope',
        '',
      ].join('\n');
      const result = await validateFile({
        yaml,
        validateSchema: failFn([
          oneOfErrorAt('/steps/0/with/url'),
          {
            instancePath: '/steps/1',
            schemaPath: '#/additionalProperties',
            keyword: 'additionalProperties',
            params: { additionalProperty: 'connector-id' },
            message: 'must NOT have additional properties',
          },
        ] as ErrorObject[]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(false);
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.1',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
      expect(warningsOf(result)).toEqual([
        {
          source: 'liquidjs-expression',
          severity: 'warning',
          message: 'strict validation skipped (liquidjs expression)',
          path: 'steps.0.with.url',
        },
      ]);
    });

    it('keeps a templated step type as a failing error (structural, anchored on the object)', async () => {
      const yaml = [
        'version: "1"',
        'steps:',
        '  - name: lookup',
        '    type: "{{ inputs.type }}"',
        '',
      ].join('\n');
      const result = await validateFile({
        yaml,
        validateSchema: failFn([
          {
            instancePath: '/steps/0',
            schemaPath: '#/discriminator',
            keyword: 'discriminator',
            params: { error: 'mapping', tag: 'type', tagValue: '{{ inputs.type }}' },
            message: 'value of tag "type" must be in oneOf',
          },
        ] as ErrorObject[]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(false);
      expect(warningsOf(result)).toEqual([]);
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0.type',
          message: 'unknown step type "{{ inputs.type }}"',
        },
      ]);
    });
  });

  describe('managed-placeholder warnings (--variant managed)', () => {
    /** A single-step workflow whose `with.value` holds `value`. */
    const withValue = (value: string): string =>
      [
        'version: "1"',
        'steps:',
        '  - name: detect',
        '    type: console',
        '    with:',
        `      value: ${value}`,
        '',
      ].join('\n');

    const errorAt = (instancePath: string): ErrorObject =>
      ({
        instancePath,
        schemaPath: '#/properties/with/properties/value/type',
        keyword: 'type',
        params: { type: 'number' },
        message: 'must be number',
      } as ErrorObject);

    const warningsOf = (result: { issues: ValidationIssue[] }) =>
      result.issues.filter((issue) => issue.severity === 'warning');

    it('downgrades a whole-value __TOKEN__ (number position) to a non-failing warning', async () => {
      const result = await validateFile({
        yaml: withValue('__DETECTION_INTERVAL_MINUTES__'),
        validateSchema: failFn([errorAt('/steps/0/with/value')]),
        variantMode: 'managed',
      });
      expect(result.schemaPassed).toBe(true);
      expect(result.variant).toBe('strict');
      expect(schemaIssuesOf(result)).toEqual([]);
      expect(warningsOf(result)).toEqual([
        {
          source: 'managed-placeholder',
          severity: 'warning',
          message: 'strict validation skipped (managed placeholder)',
          path: 'steps.0.with.value',
        },
      ]);
    });

    it('downgrades an EMBEDDED __TOKEN__ inside a longer string', async () => {
      const result = await validateFile({
        yaml: withValue('"__DETECTION_INTERVAL_MINUTES__m"'),
        validateSchema: failFn([errorAt('/steps/0/with/value')]),
        variantMode: 'managed',
      });
      expect(result.schemaPassed).toBe(true);
      expect(warningsOf(result)).toHaveLength(1);
      expect(schemaIssuesOf(result)).toEqual([]);
    });

    it('keeps __TOKEN__ as a failing error under strict (tolerance is gated to managed)', async () => {
      const result = await validateFile({
        yaml: withValue('__DETECTION_INTERVAL_MINUTES__'),
        validateSchema: failFn([errorAt('/steps/0/with/value')]),
        variantMode: 'strict',
      });
      expect(result.schemaPassed).toBe(false);
      expect(warningsOf(result)).toEqual([]);
      expect(schemaIssuesOf(result)).toEqual([
        { source: 'schema', path: 'steps.0.with.value', message: 'must be number' },
      ]);
    });

    it('tolerates a placeholder inside a union `with` (scheduled trigger `every`/`rrule`)', async () => {
      // A `z.union([{ every }, { rrule }])` `with`: the placeholder `every` fails
      // branch 0 at the tolerated scalar, so the sibling `rrule` branch reports
      // `required` / `additionalProperties` anchored on the `with` object itself.
      const yaml = [
        'version: "1"',
        'triggers:',
        '  - type: scheduled',
        '    with:',
        '      every: "__DETECTION_INTERVAL_MINUTES__m"',
        '',
      ].join('\n');
      const result = await validateFile({
        yaml,
        validateSchema: failFn([
          {
            instancePath: '/triggers/0/with/every',
            schemaPath: '#/.../every/anyOf/0/pattern',
            keyword: 'pattern',
            params: { pattern: '^(([6-9]\\d|\\d{3,})s|\\d+[mhd])$' },
            message: 'must match pattern',
          },
          {
            instancePath: '/triggers/0/with',
            schemaPath: '#/.../with/anyOf',
            keyword: 'anyOf',
            params: {},
            message: 'must match a schema in anyOf',
          },
          {
            instancePath: '/triggers/0/with',
            schemaPath: '#/.../with/anyOf/1/required',
            keyword: 'required',
            params: { missingProperty: 'rrule' },
            message: "must have required property 'rrule'",
          },
          {
            instancePath: '/triggers/0/with',
            schemaPath: '#/.../with/anyOf/1/additionalProperties',
            keyword: 'additionalProperties',
            params: { additionalProperty: 'every' },
            message: 'must NOT have additional properties',
          },
        ] as ErrorObject[]),
        variantMode: 'managed',
      });
      expect(result.schemaPassed).toBe(true);
      expect(schemaIssuesOf(result)).toEqual([]);
      expect(warningsOf(result)).toEqual([
        {
          source: 'managed-placeholder',
          severity: 'warning',
          message: 'strict validation skipped (managed placeholder)',
          path: 'triggers.0.with.every',
        },
      ]);
    });

    it('keeps a real error at a non-placeholder sibling while warning on the token', async () => {
      const yaml = [
        'version: "1"',
        'steps:',
        '  - name: detect',
        '    type: console',
        '    with:',
        '      value: __DETECTION_INTERVAL_MINUTES__',
        '  - name: other',
        '    type: console',
        '    connector-id: nope',
        '',
      ].join('\n');
      const result = await validateFile({
        yaml,
        validateSchema: failFn([
          errorAt('/steps/0/with/value'),
          {
            instancePath: '/steps/1',
            schemaPath: '#/additionalProperties',
            keyword: 'additionalProperties',
            params: { additionalProperty: 'connector-id' },
            message: 'must NOT have additional properties',
          },
        ] as ErrorObject[]),
        variantMode: 'managed',
      });
      expect(result.schemaPassed).toBe(false);
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.1',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
      expect(warningsOf(result)).toEqual([
        {
          source: 'managed-placeholder',
          severity: 'warning',
          message: 'strict validation skipped (managed placeholder)',
          path: 'steps.0.with.value',
        },
      ]);
    });
  });
});
